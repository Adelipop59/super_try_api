import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { CreateProfileDto } from './dto/create-profile.dto';
import { Profile, UserRole, SessionStatus } from '@prisma/client';
import {
  PaginatedResponse,
  createPaginatedResponse,
  calculateOffset,
} from '../../common/dto/pagination.dto';
import { ProOverviewDto } from './dto/pro-overview.dto';
import { DashboardStatsDto } from './dto/dashboard-stats.dto';
import { StripeService } from '../stripe/stripe.service';
import { LogsService } from '../logs/logs.service';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class UsersService {
  constructor(
    private prismaService: PrismaService,
    private stripeService: StripeService,
    private logsService: LogsService,
    private configService: ConfigService,
  ) {}

  /**
   * Get unified dashboard statistics in a single query
   * Returns all necessary data for the dashboard based on user role
   */
  async getDashboardStats(userId: string): Promise<DashboardStatsDto> {
    const profile = await this.getProfileById(userId);

    // Get wallet balance (works for all roles)
    const walletBalance = await this.prismaService.wallet
      .findUnique({
        where: { userId },
        select: { balance: true, currency: true },
      })
      .catch(() => null);

    const balance = walletBalance?.balance ? Number(walletBalance.balance) : 0;
    const currency = walletBalance?.currency || 'EUR';

    if (profile.role === UserRole.PRO || profile.role === UserRole.ADMIN) {
      // Récupérer les IDs des campagnes du vendeur
      const campaigns = await this.prismaService.campaign.findMany({
        where: { sellerId: userId },
        select: { id: true },
      });
      const campaignIds = campaigns.map((c) => c.id);

      console.log(
        `[getDashboardStats] User ${userId} has ${campaignIds.length} campaigns`,
      );
      console.log('[getDashboardStats] Campaign IDs:', campaignIds);

      // PRO/ADMIN: Get comprehensive stats including campaigns and products
      const [
        totalProducts,
        totalCampaigns,
        activeCampaigns,
        testsInProgress,
        testsDone,
        totalSpentResult,
      ] = await Promise.all([
        this.prismaService.product.count({ where: { sellerId: userId } }),
        this.prismaService.campaign.count({ where: { sellerId: userId } }),
        this.prismaService.campaign.count({
          where: { sellerId: userId, status: 'ACTIVE' },
        }),
        this.prismaService.session.count({
          where: {
            campaign: { sellerId: userId },
            status: SessionStatus.IN_PROGRESS,
          },
        }),
        this.prismaService.session.count({
          where: {
            campaign: { sellerId: userId },
            status: SessionStatus.COMPLETED,
          },
        }),
        this.prismaService.transaction.aggregate({
          where: {
            campaignId: { in: campaignIds },
            status: 'COMPLETED',
            type: 'CAMPAIGN_PAYMENT',
          },
          _sum: { amount: true },
        }),
      ]);

      const totalSpent = totalSpentResult._sum.amount
        ? Number(totalSpentResult._sum.amount)
        : 0;

      console.log('[getDashboardStats] Total spent result:', totalSpentResult);
      console.log('[getDashboardStats] Total spent:', totalSpent);

      // Get spending chart data (last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const dailyTransactions = await this.prismaService.transaction.groupBy({
        by: ['createdAt'],
        where: {
          campaignId: { in: campaignIds },
          status: 'COMPLETED',
          type: 'CAMPAIGN_PAYMENT',
          createdAt: { gte: thirtyDaysAgo },
        },
        _sum: { amount: true },
        _count: true,
      });

      // Group by day
      const spendingByDay = new Map<
        string,
        { amount: number; count: number }
      >();
      dailyTransactions.forEach((transaction) => {
        const dateKey = transaction.createdAt.toISOString().split('T')[0];
        const existing = spendingByDay.get(dateKey) || { amount: 0, count: 0 };
        const transactionAmount = transaction._sum.amount
          ? Number(transaction._sum.amount)
          : 0;
        spendingByDay.set(dateKey, {
          amount: existing.amount + transactionAmount,
          count: existing.count + transaction._count,
        });
      });

      // Generate chart data with all 30 days
      const spendingChart: Array<{
        date: string;
        amount: number;
        campaignCount: number;
      }> = [];
      for (let i = 29; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateKey = date.toISOString().split('T')[0];
        const data = spendingByDay.get(dateKey) || { amount: 0, count: 0 };
        spendingChart.push({
          date: dateKey,
          amount: data.amount,
          campaignCount: data.count,
        });
      }

      return {
        totalSessions: testsInProgress + testsDone,
        activeSessions: testsInProgress,
        completedSessions: testsDone,
        pendingSessions: 0,
        balance,
        currency,
        totalCampaigns,
        activeCampaigns,
        totalProducts,
        testsInProgress,
        testsDone,
        totalSpent,
        spendingChart,
      };
    } else {
      // USER: Get basic session stats
      const sessions = await this.prismaService.session.findMany({
        where: { testerId: userId },
        select: { status: true },
      });

      const totalSessions = sessions.length;
      const activeSessions = sessions.filter((s) =>
        ['ACCEPTED', 'PURCHASE_SUBMITTED', 'IN_PROGRESS'].includes(s.status),
      ).length;
      const completedSessions = sessions.filter(
        (s) => s.status === SessionStatus.COMPLETED,
      ).length;
      const pendingSessions = sessions.filter(
        (s) => s.status === 'PENDING',
      ).length;

      return {
        totalSessions,
        activeSessions,
        completedSessions,
        pendingSessions,
        balance,
        currency,
      };
    }
  }

  /**
   * Create a new profile
   * Used by Auth module during signup and OAuth
   */
  async createProfile(createProfileDto: CreateProfileDto): Promise<Profile> {
    // Check if profile already exists
    const existingProfile = await this.getProfileBySupabaseId(
      createProfileDto.supabaseUserId,
    );

    if (existingProfile) {
      throw new BadRequestException('Profile already exists for this user');
    }

    // Check if email is already used
    const emailExists = await this.getProfileByEmail(createProfileDto.email);
    if (emailExists) {
      throw new BadRequestException('Email already in use');
    }

    return this.prismaService.profile.create({
      data: {
        supabaseUserId: createProfileDto.supabaseUserId,
        email: createProfileDto.email,
        role: createProfileDto.role || UserRole.USER,
        firstName: createProfileDto.firstName,
        lastName: createProfileDto.lastName,
        phone: createProfileDto.phone,
        avatar: createProfileDto.avatar,
        companyName: createProfileDto.companyName,
        siret: createProfileDto.siret,
        country: createProfileDto.country,
        authProvider: createProfileDto.authProvider,
        isOnboarded: createProfileDto.isOnboarded ?? true, // Default to true for non-OAuth signups
      },
    });
  }

  /**
   * Get all profiles with pagination (admin only)
   */
  async getAllProfiles(filters?: {
    role?: string;
    isActive?: boolean;
    isVerified?: boolean;
    page?: number;
    limit?: number;
  }): Promise<PaginatedResponse<Profile>> {
    const page = filters?.page || 1;
    const limit = filters?.limit || 20;
    const offset = calculateOffset(page, limit);

    const where = {
      ...(filters?.role && { role: filters.role as any }),
      ...(filters?.isActive !== undefined && { isActive: filters.isActive }),
      ...(filters?.isVerified !== undefined && {
        isVerified: filters.isVerified,
      }),
    };

    const [profiles, total] = await Promise.all([
      this.prismaService.profile.findMany({
        where,
        orderBy: {
          createdAt: 'desc',
        },
        take: limit,
        skip: offset,
      }),
      this.prismaService.profile.count({ where }),
    ]);

    return createPaginatedResponse(profiles, total, page, limit);
  }

  /**
   * Get profile by ID
   */
  async getProfileById(id: string): Promise<Profile> {
    const profile = await this.prismaService.profile.findUnique({
      where: { id },
    });

    if (!profile) {
      throw new NotFoundException(`Profile with ID ${id} not found`);
    }

    return profile;
  }

  /**
   * Get profile by Supabase user ID
   */
  async getProfileBySupabaseId(
    supabaseUserId: string,
  ): Promise<Profile | null> {
    return this.prismaService.profile.findUnique({
      where: { supabaseUserId },
    });
  }

  /**
   * Get profile by email
   */
  async getProfileByEmail(email: string): Promise<Profile | null> {
    return this.prismaService.profile.findUnique({
      where: { email },
    });
  }

  /**
   * Update profile
   */
  async updateProfile(
    id: string,
    updateProfileDto: UpdateProfileDto,
  ): Promise<Profile> {
    const profile = await this.getProfileById(id);

    if (!profile) {
      throw new NotFoundException(`Profile with ID ${id} not found`);
    }

    return this.prismaService.profile.update({
      where: { id },
      data: updateProfileDto,
    });
  }

  /**
   * Update device token for push notifications
   */
  async updateDeviceToken(
    id: string,
    deviceToken: string | null,
  ): Promise<Profile> {
    const profile = await this.getProfileById(id);

    if (!profile) {
      throw new NotFoundException(`Profile with ID ${id} not found`);
    }

    return this.prismaService.profile.update({
      where: { id },
      data: { deviceToken },
    });
  }

  /**
   * Delete profile (soft delete by setting isActive to false)
   */
  async deleteProfile(id: string): Promise<Profile> {
    const profile = await this.getProfileById(id);

    if (!profile) {
      throw new NotFoundException(`Profile with ID ${id} not found`);
    }

    return this.prismaService.profile.update({
      where: { id },
      data: { isActive: false },
    });
  }

  /**
   * Verify user profile
   */
  async verifyProfile(id: string): Promise<Profile> {
    const profile = await this.getProfileById(id);

    if (!profile) {
      throw new NotFoundException(`Profile with ID ${id} not found`);
    }

    if (profile.isVerified) {
      throw new BadRequestException('Profile is already verified');
    }

    return this.prismaService.profile.update({
      where: { id },
      data: { isVerified: true },
    });
  }

  /**
   * Change user role (admin only)
   */
  async changeRole(
    id: string,
    newRole: 'USER' | 'PRO' | 'ADMIN',
  ): Promise<Profile> {
    const profile = await this.getProfileById(id);

    if (!profile) {
      throw new NotFoundException(`Profile with ID ${id} not found`);
    }

    return this.prismaService.profile.update({
      where: { id },
      data: { role: newRole },
    });
  }

  /**
   * Get PRO overview with KPIs and spending chart
   */
  async getProOverview(sellerId: string): Promise<ProOverviewDto> {
    // Vérifier que l'utilisateur est PRO
    const profile = await this.getProfileById(sellerId);
    if (profile.role !== UserRole.PRO) {
      throw new BadRequestException(
        'This endpoint is only available for PRO users',
      );
    }

    // Compter les produits
    const totalProducts = await this.prismaService.product.count({
      where: { sellerId },
    });

    // Compter les campagnes
    const totalCampaigns = await this.prismaService.campaign.count({
      where: { sellerId },
    });

    // Compter les sessions (tests) en cours et terminés
    const [testsInProgress, testsDone] = await Promise.all([
      this.prismaService.session.count({
        where: {
          campaign: { sellerId },
          status: SessionStatus.IN_PROGRESS,
        },
      }),
      this.prismaService.session.count({
        where: {
          campaign: { sellerId },
          status: SessionStatus.COMPLETED,
        },
      }),
    ]);

    // Récupérer les IDs des campagnes du vendeur
    const campaigns = await this.prismaService.campaign.findMany({
      where: { sellerId },
      select: { id: true },
    });
    const campaignIds = campaigns.map((c) => c.id);

    // Calculer le montant total dépensé (transactions COMPLETED pour les campagnes du vendeur)
    const totalSpentResult = await this.prismaService.transaction.aggregate({
      where: {
        campaignId: { in: campaignIds },
        status: 'COMPLETED',
        type: 'CAMPAIGN_PAYMENT',
      },
      _sum: {
        amount: true,
      },
    });

    const totalSpent = totalSpentResult._sum.amount
      ? Number(totalSpentResult._sum.amount)
      : 0;

    // Générer les données du graphique (derniers 30 jours)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const dailyTransactions = await this.prismaService.transaction.groupBy({
      by: ['createdAt'],
      where: {
        campaignId: { in: campaignIds },
        status: 'COMPLETED',
        type: 'CAMPAIGN_PAYMENT',
        createdAt: {
          gte: thirtyDaysAgo,
        },
      },
      _sum: {
        amount: true,
      },
      _count: true,
    });

    // Créer un map pour regrouper par jour
    const spendingByDay = new Map<string, { amount: number; count: number }>();

    dailyTransactions.forEach((transaction) => {
      const dateKey = transaction.createdAt.toISOString().split('T')[0];
      const existing = spendingByDay.get(dateKey) || { amount: 0, count: 0 };
      const transactionAmount = transaction._sum.amount
        ? Number(transaction._sum.amount)
        : 0;
      spendingByDay.set(dateKey, {
        amount: existing.amount + transactionAmount,
        count: existing.count + transaction._count,
      });
    });

    // Générer le tableau final avec tous les jours (même ceux sans dépenses)
    const spendingChart: Array<{
      date: string;
      amount: number;
      campaignCount: number;
    }> = [];
    for (let i = 29; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateKey = date.toISOString().split('T')[0];
      const data = spendingByDay.get(dateKey) || { amount: 0, count: 0 };
      spendingChart.push({
        date: dateKey,
        amount: data.amount,
        campaignCount: data.count,
      });
    }

    return {
      totalProducts,
      totalCampaigns,
      testsInProgress,
      testsDone,
      totalSpent,
      spendingChart,
    };
  }

  /**
   * Initiate Stripe Identity verification for USER role
   */
  async initiateStripeVerification(userId: string): Promise<{
    verification_url: string;
    session_id: string;
  }> {
    const profile = await this.getProfileById(userId);

    if (profile.role !== UserRole.USER) {
      throw new ForbiddenException(
        'KYC verification is only available for testers (USER role)',
      );
    }

    // Vérifier si l'utilisateur est déjà vérifié
    const profileWithVerification = profile as any;
    if (profileWithVerification.verificationStatus === 'verified') {
      throw new BadRequestException('User is already verified');
    }

    // 🔒 SÉCURITÉ : Vérifier si une session KYC est déjà en cours
    if (
      profileWithVerification.stripeVerificationSessionId &&
      profileWithVerification.verificationStatus === 'pending'
    ) {
      // Vérifier le statut de la session Stripe existante
      try {
        const existingSession = await this.stripeService.getVerificationSession(
          profileWithVerification.stripeVerificationSessionId,
        );

        // Si la session est encore active (non expirée), retourner l'URL existante
        if (existingSession.status === 'requires_input') {
          await this.logsService.logWarning(
            'USER' as any,
            `Tentative de création d'une nouvelle session KYC alors qu'une session est déjà en cours: ${profileWithVerification.stripeVerificationSessionId}`,
            { existingSessionId: existingSession.id },
            userId,
          );

          return {
            verification_url: existingSession.url!,
            session_id: existingSession.id,
          };
        }

        // Si la session est expirée ou dans un autre état final, on peut en créer une nouvelle
        // On nettoie l'ancienne session
        await this.prismaService.profile.update({
          where: { id: userId },
          data: {
            stripeVerificationSessionId: null,
            verificationStatus: 'unverified',
          },
        });
      } catch (error) {
        // Si erreur Stripe (session introuvable), nettoyer et continuer
        await this.prismaService.profile.update({
          where: { id: userId },
          data: {
            stripeVerificationSessionId: null,
            verificationStatus: 'unverified',
          },
        });
      }
    }

    // Create Stripe Customer if it doesn't exist
    if (!profile.stripeCustomerId) {
      const customer = await this.stripeService.createCustomer(userId, {
        email: profile.email,
        name: `${profile.firstName || ''} ${profile.lastName || ''}`.trim(),
        phone: profile.phone || undefined,
      });

      await this.prismaService.profile.update({
        where: { id: userId },
        data: { stripeCustomerId: customer.id },
      });
    }

    // Create Stripe Identity VerificationSession
    const frontendUrl = this.configService.get<string>('FRONTEND_URL');
    const session = await this.stripeService.createVerificationSession({
      type: 'document',
      metadata: { userId, profileId: userId },
      options: {
        document: {
          require_matching_selfie: true,
          require_live_capture: true,
          allowed_types: ['passport', 'driving_license', 'id_card'],
        },
      },
      return_url: `${frontendUrl}/profile/verification/complete`,
    });

    // Save verification session ID
    await this.prismaService.profile.update({
      where: { id: userId },
      data: {
        stripeVerificationSessionId: session.id,
        verificationStatus: 'pending',
      },
    });

    // Log the action
    await this.logsService.logInfo(
      'USER' as any,
      `Stripe Identity verification initiated: ${session.id}`,
      { verificationSessionId: session.id },
      userId,
    );

    return {
      verification_url: session.url!,
      session_id: session.id,
    };
  }

  /**
   * Get verification status for a user
   */
  async getVerificationStatus(userId: string): Promise<{
    status: string;
    verified_at?: string;
    failure_reason?: string;
  }> {
    const profile = await this.prismaService.profile.findUnique({
      where: { id: userId },
      select: {
        verificationStatus: true,
        verifiedAt: true,
        verificationFailedReason: true,
        isVerified: true,
      },
    });

    if (!profile) {
      throw new NotFoundException(`Profile with ID ${userId} not found`);
    }

    return {
      status: profile.verificationStatus || 'unverified',
      verified_at: profile.verifiedAt?.toISOString(),
      failure_reason: profile.verificationFailedReason || undefined,
    };
  }

  /**
   * Retry verification after failure
   */
  async retryVerification(userId: string): Promise<{
    verification_url: string;
    session_id: string;
  }> {
    const profile = await this.getProfileById(userId);

    if (profile.verificationStatus === 'verified') {
      throw new BadRequestException(
        'User is already verified, no need to retry',
      );
    }

    // Reset verification status
    await this.prismaService.profile.update({
      where: { id: userId },
      data: {
        verificationStatus: 'unverified',
        stripeVerificationSessionId: null,
        verificationFailedReason: null,
      },
    });

    // Log the retry
    await this.logsService.logInfo(
      'USER' as any,
      'User retrying identity verification',
      undefined,
      userId,
    );

    // Create new verification session
    return this.initiateStripeVerification(userId);
  }

  /**
   * Get list of available countries with their availability status
   * @param locale - Language for country names (en or fr)
   * @returns List of countries sorted by active status first
   *
   * Availability logic:
   * 1. Priority countries (from PRIORITY_COUNTRIES env) are always available
   * 2. Other countries are available if they have >= MIN_TESTERS_PER_COUNTRY testers
   */
  async getAvailableCountries(locale: string = 'fr'): Promise<any[]> {
    // Get priority countries from env
    const priorityCountriesEnv = this.configService.get<string>(
      'PRIORITY_COUNTRIES',
      'FR',
    );
    const priorityCountries = priorityCountriesEnv
      .split(',')
      .map((c) => c.trim());

    // Get minimum testers threshold from env
    const minTestersPerCountry = this.configService.get<number>(
      'MIN_TESTERS_PER_COUNTRY',
      10,
    );

    // Get all countries
    const countries = await this.prismaService.country.findMany({
      orderBy: [{ name: 'asc' }],
    });

    // Count testers per country
    const testerCounts = await this.prismaService.profile.groupBy({
      by: ['country'],
      where: {
        role: UserRole.USER,
        country: { not: null },
      },
      _count: {
        country: true,
      },
    });

    // Create a map of country code -> tester count
    const testerCountMap = new Map<string, number>();
    testerCounts.forEach((item) => {
      if (item.country) {
        testerCountMap.set(item.country, item._count.country);
      }
    });

    // Calculate dynamic availability for each country
    const countriesWithAvailability = countries.map((c) => {
      const isPriority = priorityCountries.includes(c.code);
      const testerCount = testerCountMap.get(c.code) || 0;
      const isActive = isPriority || testerCount >= minTestersPerCountry;

      return {
        code: c.code,
        name: locale === 'fr' ? c.nameFr : c.nameEn,
        nameEn: c.nameEn,
        nameFr: c.nameFr,
        isActive,
        region: c.region,
      };
    });

    // Sort: active first, then alphabetical
    return countriesWithAvailability.sort((a, b) => {
      if (a.isActive !== b.isActive) {
        return a.isActive ? -1 : 1;
      }
      return a.name.localeCompare(b.name);
    });
  }

  /**
   * Get countries selected by a PRO user
   * @param profileId - PRO profile ID
   * @param locale - Language for country names (en or fr)
   * @returns List of countries selected by the PRO
   */
  async getProfileCountries(
    profileId: string,
    locale: string = 'fr',
  ): Promise<any[]> {
    const profile = await this.getProfileById(profileId);

    // Check if profile is PRO
    if (profile.role !== 'PRO') {
      throw new BadRequestException(
        'This endpoint is only available for PRO users',
      );
    }

    // Get profile countries with country details
    const profileCountries = await this.prismaService.profileCountry.findMany({
      where: { profileId },
      include: {
        country: true,
      },
      orderBy: {
        country: {
          isActive: 'desc',
        },
      },
    });

    return profileCountries.map((pc) => ({
      code: pc.country.code,
      name: locale === 'fr' ? pc.country.nameFr : pc.country.nameEn,
      nameEn: pc.country.nameEn,
      nameFr: pc.country.nameFr,
      isActive: pc.country.isActive,
      region: pc.country.region,
    }));
  }
}
