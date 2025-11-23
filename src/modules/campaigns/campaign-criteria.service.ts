import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateCampaignCriteriaDto } from './dto/create-campaign-criteria.dto';
import { UpdateCampaignCriteriaDto } from './dto/update-campaign-criteria.dto';
import { CampaignCriteriaResponseDto } from './dto/campaign-criteria-response.dto';

@Injectable()
export class CampaignCriteriaService {
  constructor(private readonly prismaService: PrismaService) {}

  /**
   * Create campaign criteria
   */
  async create(
    campaignId: string,
    dto: CreateCampaignCriteriaDto,
  ): Promise<CampaignCriteriaResponseDto> {
    // Vérifier que la campagne existe
    const campaign = await this.prismaService.campaign.findUnique({
      where: { id: campaignId },
    });

    if (!campaign) {
      throw new NotFoundException(`Campaign with ID ${campaignId} not found`);
    }

    // Vérifier qu'il n'y a pas déjà de critères pour cette campagne
    const existing = await this.prismaService.campaignCriteria.findUnique({
      where: { campaignId },
    });

    if (existing) {
      throw new ConflictException(
        `Criteria already exist for campaign ${campaignId}. Use update instead.`,
      );
    }

    const criteria = await this.prismaService.campaignCriteria.create({
      data: {
        campaignId,
        minAge: dto.minAge,
        maxAge: dto.maxAge,
        minRating: dto.minRating,
        maxRating: dto.maxRating,
        minCompletedSessions: dto.minCompletedSessions,
        requiredGender: dto.requiredGender,
        requiredLocations: dto.requiredLocations ?? [],
        excludedLocations: dto.excludedLocations ?? [],
        requiredCategories: dto.requiredCategories ?? [],
        noActiveSessionWithSeller: dto.noActiveSessionWithSeller ?? false,
        maxSessionsPerWeek: dto.maxSessionsPerWeek,
        maxSessionsPerMonth: dto.maxSessionsPerMonth,
        minCompletionRate: dto.minCompletionRate,
        maxCancellationRate: dto.maxCancellationRate,
        minAccountAge: dto.minAccountAge,
        lastActiveWithinDays: dto.lastActiveWithinDays,
        requireVerified: dto.requireVerified ?? false,
        requirePrime: dto.requirePrime ?? false,
      },
    });

    return this.formatResponse(criteria);
  }

  /**
   * Get criteria by campaign ID
   */
  async findByCampaignId(
    campaignId: string,
  ): Promise<CampaignCriteriaResponseDto | null> {
    const criteria = await this.prismaService.campaignCriteria.findUnique({
      where: { campaignId },
    });

    if (!criteria) {
      return null;
    }

    return this.formatResponse(criteria);
  }

  /**
   * Update campaign criteria
   */
  async update(
    campaignId: string,
    dto: UpdateCampaignCriteriaDto,
  ): Promise<CampaignCriteriaResponseDto> {
    const existing = await this.prismaService.campaignCriteria.findUnique({
      where: { campaignId },
    });

    if (!existing) {
      throw new NotFoundException(
        `Criteria not found for campaign ${campaignId}`,
      );
    }

    const updated = await this.prismaService.campaignCriteria.update({
      where: { campaignId },
      data: {
        minAge: dto.minAge,
        maxAge: dto.maxAge,
        minRating: dto.minRating,
        maxRating: dto.maxRating,
        minCompletedSessions: dto.minCompletedSessions,
        requiredGender: dto.requiredGender,
        requiredLocations: dto.requiredLocations,
        excludedLocations: dto.excludedLocations,
        requiredCategories: dto.requiredCategories,
        noActiveSessionWithSeller: dto.noActiveSessionWithSeller,
        maxSessionsPerWeek: dto.maxSessionsPerWeek,
        maxSessionsPerMonth: dto.maxSessionsPerMonth,
        minCompletionRate: dto.minCompletionRate,
        maxCancellationRate: dto.maxCancellationRate,
        minAccountAge: dto.minAccountAge,
        lastActiveWithinDays: dto.lastActiveWithinDays,
        requireVerified: dto.requireVerified,
        requirePrime: dto.requirePrime,
      },
    });

    return this.formatResponse(updated);
  }

  /**
   * Delete campaign criteria
   */
  async delete(campaignId: string): Promise<void> {
    const existing = await this.prismaService.campaignCriteria.findUnique({
      where: { campaignId },
    });

    if (!existing) {
      throw new NotFoundException(
        `Criteria not found for campaign ${campaignId}`,
      );
    }

    await this.prismaService.campaignCriteria.delete({
      where: { campaignId },
    });
  }

  /**
   * Check if a tester matches campaign criteria
   */
  async checkTesterEligibility(
    campaignId: string,
    testerId: string,
  ): Promise<{ eligible: boolean; reasons: string[] }> {
    const criteria = await this.prismaService.campaignCriteria.findUnique({
      where: { campaignId },
      include: {
        campaign: {
          select: {
            sellerId: true,
          },
        },
      },
    });

    // Si pas de critères, tous les testeurs sont éligibles
    if (!criteria) {
      return { eligible: true, reasons: [] };
    }

    const tester = await this.prismaService.profile.findUnique({
      where: { id: testerId },
    });

    if (!tester) {
      return { eligible: false, reasons: ['Tester not found'] };
    }

    const reasons: string[] = [];

    // Vérifier l'âge
    if (criteria.minAge !== null || criteria.maxAge !== null) {
      if (!tester.birthDate) {
        reasons.push('Date de naissance non renseignée');
      } else {
        const age = this.calculateAge(tester.birthDate);
        if (criteria.minAge !== null && age < criteria.minAge) {
          reasons.push(`Âge minimum requis: ${criteria.minAge} ans`);
        }
        if (criteria.maxAge !== null && age > criteria.maxAge) {
          reasons.push(`Âge maximum requis: ${criteria.maxAge} ans`);
        }
      }
    }

    // Vérifier la note
    if (criteria.minRating !== null || criteria.maxRating !== null) {
      const rating = tester.averageRating
        ? parseFloat(tester.averageRating.toString())
        : 0;
      if (
        criteria.minRating !== null &&
        rating < parseFloat(criteria.minRating.toString())
      ) {
        reasons.push(`Note minimum requise: ${criteria.minRating}/5`);
      }
      if (
        criteria.maxRating !== null &&
        rating > parseFloat(criteria.maxRating.toString())
      ) {
        reasons.push(`Note maximum requise: ${criteria.maxRating}/5`);
      }
    }

    // Vérifier l'expérience
    if (
      criteria.minCompletedSessions !== null &&
      tester.completedSessionsCount < criteria.minCompletedSessions
    ) {
      reasons.push(
        `Nombre minimum de tests complétés: ${criteria.minCompletedSessions}`,
      );
    }

    // Vérifier le genre
    if (
      criteria.requiredGender &&
      criteria.requiredGender !== 'ALL' &&
      tester.gender !== criteria.requiredGender
    ) {
      reasons.push(`Genre requis: ${criteria.requiredGender}`);
    }

    // Vérifier la localisation (requises)
    if (criteria.requiredLocations.length > 0) {
      if (!tester.location) {
        reasons.push('Localisation non renseignée');
      } else if (!criteria.requiredLocations.includes(tester.location)) {
        reasons.push(
          `Localisation requise: ${criteria.requiredLocations.join(', ')}`,
        );
      }
    }

    // Vérifier la localisation (exclues)
    if (criteria.excludedLocations.length > 0 && tester.location) {
      if (criteria.excludedLocations.includes(tester.location)) {
        reasons.push(`Localisation exclue: ${tester.location}`);
      }
    }

    // Vérifier les catégories préférées
    if (criteria.requiredCategories.length > 0) {
      const hasMatchingCategory = criteria.requiredCategories.some((catId) =>
        tester.preferredCategories.includes(catId),
      );
      if (!hasMatchingCategory) {
        reasons.push('Aucune catégorie préférée correspondante');
      }
    }

    // Vérifier pas de session en cours avec ce vendeur
    if (criteria.noActiveSessionWithSeller) {
      const activeSession = await this.prismaService.session.findFirst({
        where: {
          testerId,
          campaign: {
            sellerId: criteria.campaign.sellerId,
          },
          status: {
            in: ['PENDING', 'ACCEPTED', 'IN_PROGRESS', 'SUBMITTED'],
          },
        },
      });
      if (activeSession) {
        reasons.push('Vous avez déjà une session en cours avec ce vendeur');
      }
    }

    // Vérifier limite de sessions par semaine
    if (criteria.maxSessionsPerWeek !== null) {
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
      const sessionsThisWeek = await this.prismaService.session.count({
        where: {
          testerId,
          createdAt: { gte: oneWeekAgo },
        },
      });
      if (sessionsThisWeek >= criteria.maxSessionsPerWeek) {
        reasons.push(
          `Limite hebdomadaire atteinte: ${criteria.maxSessionsPerWeek} sessions/semaine`,
        );
      }
    }

    // Vérifier limite de sessions par mois
    if (criteria.maxSessionsPerMonth !== null) {
      const oneMonthAgo = new Date();
      oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
      const sessionsThisMonth = await this.prismaService.session.count({
        where: {
          testerId,
          createdAt: { gte: oneMonthAgo },
        },
      });
      if (sessionsThisMonth >= criteria.maxSessionsPerMonth) {
        reasons.push(
          `Limite mensuelle atteinte: ${criteria.maxSessionsPerMonth} sessions/mois`,
        );
      }
    }

    // Vérifier taux de complétion minimum
    if (criteria.minCompletionRate !== null) {
      const totalSessions = tester.totalSessionsCount || 0;
      const completedSessions = tester.completedSessionsCount || 0;
      if (totalSessions > 0) {
        const completionRate = (completedSessions / totalSessions) * 100;
        if (completionRate < parseFloat(criteria.minCompletionRate.toString())) {
          reasons.push(
            `Taux de complétion minimum requis: ${criteria.minCompletionRate}%`,
          );
        }
      }
    }

    // Vérifier taux d'annulation maximum
    if (criteria.maxCancellationRate !== null) {
      const totalSessions = tester.totalSessionsCount || 0;
      const cancelledSessions = tester.cancelledSessionsCount || 0;
      if (totalSessions > 0) {
        const cancellationRate = (cancelledSessions / totalSessions) * 100;
        if (
          cancellationRate > parseFloat(criteria.maxCancellationRate.toString())
        ) {
          reasons.push(
            `Taux d'annulation maximum autorisé: ${criteria.maxCancellationRate}%`,
          );
        }
      }
    }

    // Vérifier ancienneté du compte
    if (criteria.minAccountAge !== null) {
      const accountAgeInDays = Math.floor(
        (Date.now() - tester.createdAt.getTime()) / (1000 * 60 * 60 * 24),
      );
      if (accountAgeInDays < criteria.minAccountAge) {
        reasons.push(
          `Ancienneté minimum requise: ${criteria.minAccountAge} jours`,
        );
      }
    }

    // Vérifier activité récente
    if (criteria.lastActiveWithinDays !== null) {
      if (!tester.lastActiveAt) {
        reasons.push('Aucune activité récente enregistrée');
      } else {
        const daysSinceActive = Math.floor(
          (Date.now() - tester.lastActiveAt.getTime()) / (1000 * 60 * 60 * 24),
        );
        if (daysSinceActive > criteria.lastActiveWithinDays) {
          reasons.push(
            `Activité requise dans les ${criteria.lastActiveWithinDays} derniers jours`,
          );
        }
      }
    }

    // Vérifier compte vérifié
    if (criteria.requireVerified && !tester.isVerified) {
      reasons.push('Compte vérifié obligatoire');
    }

    // Vérifier statut premium
    if (criteria.requirePrime && !tester.isPrime) {
      reasons.push('Statut premium obligatoire');
    }

    return {
      eligible: reasons.length === 0,
      reasons,
    };
  }

  /**
   * Get all eligible testers for a campaign
   */
  async getEligibleTesters(campaignId: string): Promise<string[]> {
    const criteria = await this.prismaService.campaignCriteria.findUnique({
      where: { campaignId },
    });

    // Si pas de critères, tous les testeurs sont éligibles
    if (!criteria) {
      const allTesters = await this.prismaService.profile.findMany({
        where: { role: 'USER' },
        select: { id: true },
      });
      return allTesters.map((t) => t.id);
    }

    // Construire la requête avec les filtres
    const where: any = { role: 'USER' };

    // Filtre âge (approximatif avec date de naissance)
    if (criteria.minAge !== null || criteria.maxAge !== null) {
      where.birthDate = {};
      if (criteria.minAge !== null) {
        const maxBirthDate = new Date();
        maxBirthDate.setFullYear(maxBirthDate.getFullYear() - criteria.minAge);
        where.birthDate.lte = maxBirthDate;
      }
      if (criteria.maxAge !== null) {
        const minBirthDate = new Date();
        minBirthDate.setFullYear(minBirthDate.getFullYear() - criteria.maxAge);
        where.birthDate.gte = minBirthDate;
      }
    }

    // Filtre note
    if (criteria.minRating !== null) {
      where.averageRating = { gte: criteria.minRating };
    }
    if (criteria.maxRating !== null) {
      where.averageRating = {
        ...where.averageRating,
        lte: criteria.maxRating,
      };
    }

    // Filtre expérience
    if (criteria.minCompletedSessions !== null) {
      where.completedSessionsCount = { gte: criteria.minCompletedSessions };
    }

    // Filtre genre
    if (criteria.requiredGender && criteria.requiredGender !== 'ALL') {
      where.gender = criteria.requiredGender;
    }

    // Filtre localisation
    if (criteria.requiredLocations.length > 0) {
      where.location = { in: criteria.requiredLocations };
    }

    // Filtre catégories préférées
    if (criteria.requiredCategories.length > 0) {
      where.preferredCategories = { hasSome: criteria.requiredCategories };
    }

    const eligibleTesters = await this.prismaService.profile.findMany({
      where,
      select: { id: true },
    });

    return eligibleTesters.map((t) => t.id);
  }

  /**
   * Calculate age from birthDate
   */
  private calculateAge(birthDate: Date): number {
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();

    if (
      monthDiff < 0 ||
      (monthDiff === 0 && today.getDate() < birth.getDate())
    ) {
      age--;
    }

    return age;
  }

  /**
   * Format response
   */
  private formatResponse(criteria: any): CampaignCriteriaResponseDto {
    return {
      id: criteria.id,
      campaignId: criteria.campaignId,
      minAge: criteria.minAge,
      maxAge: criteria.maxAge,
      minRating: criteria.minRating
        ? parseFloat(criteria.minRating.toString())
        : null,
      maxRating: criteria.maxRating
        ? parseFloat(criteria.maxRating.toString())
        : null,
      minCompletedSessions: criteria.minCompletedSessions,
      requiredGender: criteria.requiredGender,
      requiredLocations: criteria.requiredLocations,
      excludedLocations: criteria.excludedLocations,
      requiredCategories: criteria.requiredCategories,
      noActiveSessionWithSeller: criteria.noActiveSessionWithSeller,
      maxSessionsPerWeek: criteria.maxSessionsPerWeek,
      maxSessionsPerMonth: criteria.maxSessionsPerMonth,
      minCompletionRate: criteria.minCompletionRate
        ? parseFloat(criteria.minCompletionRate.toString())
        : null,
      maxCancellationRate: criteria.maxCancellationRate
        ? parseFloat(criteria.maxCancellationRate.toString())
        : null,
      minAccountAge: criteria.minAccountAge,
      lastActiveWithinDays: criteria.lastActiveWithinDays,
      requireVerified: criteria.requireVerified,
      requirePrime: criteria.requirePrime,
      createdAt: criteria.createdAt,
      updatedAt: criteria.updatedAt,
    };
  }
}
