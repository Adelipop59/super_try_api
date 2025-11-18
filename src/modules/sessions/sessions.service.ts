import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { LogsService } from '../logs/logs.service';
import { WalletsService } from '../wallets/wallets.service';
import { LogCategory, SessionStatus, Prisma } from '@prisma/client';
import { ApplySessionDto } from './dto/apply-session.dto';
import { RejectSessionDto } from './dto/reject-session.dto';
import { SubmitPurchaseDto } from './dto/submit-purchase.dto';
import { SubmitTestDto } from './dto/submit-test.dto';
import { ValidateTestDto } from './dto/validate-test.dto';
import { CancelSessionDto } from './dto/cancel-session.dto';
import { DisputeSessionDto } from './dto/dispute-session.dto';
import { SessionFilterDto } from './dto/session-filter.dto';
import {
  calculateNextPurchaseDate,
  isValidPurchaseDate,
  formatDate,
} from './utils/distribution.util';

// Type helper pour les réponses Prisma (permet d'accepter any pour éviter les problèmes de Decimal)
type PrismaSessionResponse = any;

@Injectable()
export class SessionsService {
  private readonly logger = new Logger(SessionsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly logsService: LogsService,
    private readonly walletsService: WalletsService,
  ) {}

  /**
   * 1. Postuler à une campagne (USER uniquement)
   */
  async applyToCampaign(
    userId: string,
    dto: ApplySessionDto,
  ): Promise<PrismaSessionResponse> {
    // Vérifier que la campagne existe et est active
    const campaign = await this.prisma.campaign.findUnique({
      where: { id: dto.campaignId },
    });

    if (!campaign) {
      throw new NotFoundException('Campaign not found');
    }

    if (campaign.status !== 'ACTIVE') {
      throw new BadRequestException('Campaign is not active');
    }

    // Vérifier qu'il reste des slots disponibles
    if (campaign.availableSlots <= 0) {
      throw new BadRequestException('No slots available for this campaign');
    }

    // Vérifier que l'utilisateur n'a pas déjà postulé
    const existingApplication = await this.prisma.session.findFirst({
      where: {
        campaignId: dto.campaignId,
        testerId: userId,
      },
    });

    if (existingApplication) {
      throw new BadRequestException(
        'You have already applied to this campaign',
      );
    }

    // Créer la session
    const session = await this.prisma.session.create({
      data: {
        campaignId: dto.campaignId,
        testerId: userId,
        applicationMessage: dto.applicationMessage,
        status: SessionStatus.PENDING,
      },
      include: {
        campaign: {
          select: {
            id: true,
            title: true,
            description: true,
          },
        },
        tester: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    await this.logsService.logSuccess(
      LogCategory.SESSION,
      `✅ Nouvelle candidature pour la campagne "${campaign.title}"`,
      {
        sessionId: session.id,
        testerId: userId,
        campaignId: dto.campaignId,
      },
    );

    return session;
  }

  /**
   * 2. Accepter une session (PRO uniquement - propriétaire de la campagne)
   */
  async acceptSession(
    sessionId: string,
    userId: string,
    isAdmin: boolean,
  ): Promise<PrismaSessionResponse> {
    const session = await this.prisma.session.findUnique({
      where: { id: sessionId },
      include: {
        campaign: {
          include: {
            distributions: true,
          },
        },
      },
    });

    if (!session) {
      throw new NotFoundException('Session not found');
    }

    // Vérifier ownership
    if (!isAdmin && session.campaign.sellerId !== userId) {
      throw new ForbiddenException('Access denied');
    }

    // Vérifier que la session est en PENDING
    if (session.status !== SessionStatus.PENDING) {
      throw new BadRequestException('Session is not in PENDING status');
    }

    // Vérifier qu'il reste des slots
    if (session.campaign.availableSlots <= 0) {
      throw new BadRequestException('No slots available');
    }

    // Calculer la prochaine date d'achat basée sur les distributions
    const scheduledPurchaseDate = calculateNextPurchaseDate(
      session.campaign.distributions,
    );

    if (!scheduledPurchaseDate) {
      this.logger.warn(
        `No valid distribution found for campaign ${session.campaignId}`,
      );
    }

    // Mettre à jour la session et décrémenter les slots
    const [updatedSession] = await this.prisma.$transaction([
      this.prisma.session.update({
        where: { id: sessionId },
        data: {
          status: SessionStatus.ACCEPTED,
          acceptedAt: new Date(),
          scheduledPurchaseDate,
        },
        include: {
          campaign: true,
          tester: true,
        },
      }),
      this.prisma.campaign.update({
        where: { id: session.campaignId },
        data: {
          availableSlots: {
            decrement: 1,
          },
        },
      }),
    ]);

    await this.logsService.logSuccess(
      LogCategory.SESSION,
      `✅ Session acceptée pour la campagne "${session.campaign.title}"`,
      {
        sessionId,
        testerId: session.testerId,
        campaignId: session.campaignId,
      },
    );

    return updatedSession;
  }

  /**
   * 3. Refuser une session (PRO uniquement - propriétaire de la campagne)
   */
  async rejectSession(
    sessionId: string,
    userId: string,
    dto: RejectSessionDto,
    isAdmin: boolean,
  ): Promise<PrismaSessionResponse> {
    const session = await this.prisma.session.findUnique({
      where: { id: sessionId },
      include: {
        campaign: true,
      },
    });

    if (!session) {
      throw new NotFoundException('Session not found');
    }

    // Vérifier ownership
    if (!isAdmin && session.campaign.sellerId !== userId) {
      throw new ForbiddenException('Access denied');
    }

    // Vérifier que la session est en PENDING
    if (session.status !== SessionStatus.PENDING) {
      throw new BadRequestException('Session is not in PENDING status');
    }

    const updatedSession = await this.prisma.session.update({
      where: { id: sessionId },
      data: {
        status: SessionStatus.REJECTED,
        rejectedAt: new Date(),
        rejectionReason: dto.reason,
      },
      include: {
        campaign: true,
        tester: true,
      },
    });

    await this.logsService.logInfo(
      LogCategory.SESSION,
      `🔵 Session refusée pour la campagne "${session.campaign.title}"`,
      {
        sessionId,
        reason: dto.reason,
      },
    );

    return updatedSession;
  }

  /**
   * 3.5. Valider le prix du produit trouvé par le testeur (USER testeur uniquement)
   * Le testeur doit entrer le prix exact qu'il a trouvé pour vérifier qu'il est sur le bon produit.
   * On lui donne seulement une tranche de prix [prix - 5€, prix + 5€] (ou [0€, 5€] si prix < 5€)
   */
  async validateProductPrice(
    sessionId: string,
    userId: string,
    productPrice: number,
  ): Promise<PrismaSessionResponse> {
    const session = await this.prisma.session.findUnique({
      where: { id: sessionId },
      include: {
        campaign: {
          include: {
            offers: {
              include: {
                product: true,
              },
            },
          },
        },
      },
    });

    if (!session) {
      throw new NotFoundException('Session not found');
    }

    // Vérifier que c'est bien le testeur
    if (session.testerId !== userId) {
      throw new ForbiddenException('Access denied');
    }

    // Vérifier que la session est ACCEPTED
    if (session.status !== SessionStatus.ACCEPTED) {
      throw new BadRequestException(
        'Session must be ACCEPTED to validate product price',
      );
    }

    // Vérifier qu'il n'a pas déjà validé le prix
    if (session.validatedProductPrice) {
      throw new BadRequestException('Product price already validated');
    }

    // Obtenir le premier produit/offre de la campagne
    const offer = session.campaign.offers[0];
    if (!offer) {
      throw new BadRequestException('No product found for this campaign');
    }

    // Calculer la tranche de prix acceptable
    // Règle : [prix - 5€, prix + 5€] sauf si prix < 5€ alors [0€, 5€]
    const expectedPrice = Number(offer.bonus) || 0; // TODO: Utiliser le vrai prix du produit quand disponible
    let minPrice: number;
    let maxPrice: number;

    if (expectedPrice < 5) {
      minPrice = 0;
      maxPrice = 5;
    } else {
      minPrice = expectedPrice - 5;
      maxPrice = expectedPrice + 5;
    }

    // Vérifier que le prix saisi est dans la tranche acceptable
    if (productPrice < minPrice || productPrice > maxPrice) {
      await this.logsService.logWarning(
        LogCategory.SESSION,
        `❌ Prix invalide pour session ${sessionId}: ${productPrice}€ (attendu: ${minPrice}€ - ${maxPrice}€)`,
        {
          sessionId,
          enteredPrice: productPrice,
          expectedRange: { min: minPrice, max: maxPrice },
        },
      );

      throw new BadRequestException(
        `Prix incorrect. Le prix du produit doit être entre ${minPrice.toFixed(2)}€ et ${maxPrice.toFixed(2)}€`,
      );
    }

    // Valider et stocker le prix
    const updatedSession = await this.prisma.session.update({
      where: { id: sessionId },
      data: {
        validatedProductPrice: productPrice,
        priceValidatedAt: new Date(),
      },
      include: {
        campaign: true,
        tester: true,
      },
    });

    await this.logsService.logSuccess(
      LogCategory.SESSION,
      `✅ Prix validé pour la session ${sessionId}: ${productPrice}€`,
      {
        sessionId,
        validatedPrice: productPrice,
        priceRange: { min: minPrice, max: maxPrice },
      },
    );

    return updatedSession;
  }

  /**
   * 4. Soumettre la preuve d'achat (USER testeur uniquement)
   */
  async submitPurchaseProof(
    sessionId: string,
    userId: string,
    dto: SubmitPurchaseDto,
  ): Promise<PrismaSessionResponse> {
    const session = await this.prisma.session.findUnique({
      where: { id: sessionId },
      include: { campaign: true },
    });

    if (!session) {
      throw new NotFoundException('Session not found');
    }

    // Vérifier que c'est bien le testeur
    if (session.testerId !== userId) {
      throw new ForbiddenException('Access denied');
    }

    // Vérifier que la session est ACCEPTED
    if (session.status !== SessionStatus.ACCEPTED) {
      throw new BadRequestException(
        'Session must be ACCEPTED to submit purchase proof',
      );
    }

    // Vérifier que le prix du produit a été validé
    if (!session.validatedProductPrice) {
      throw new BadRequestException(
        'You must validate the product price before submitting purchase proof',
      );
    }

    // Vérifier que l'achat est fait au bon jour (si scheduledPurchaseDate est défini)
    if (session.scheduledPurchaseDate) {
      if (!isValidPurchaseDate(session.scheduledPurchaseDate)) {
        const formattedDate = formatDate(session.scheduledPurchaseDate);
        throw new BadRequestException(
          `You must purchase the product on the scheduled date: ${formattedDate}`,
        );
      }
    }

    const updatedSession = await this.prisma.session.update({
      where: { id: sessionId },
      data: {
        status: SessionStatus.IN_PROGRESS,
        purchaseProofUrl: dto.purchaseProofUrl,
        purchasedAt: new Date(),
        orderNumber: dto.orderNumber,
        productPrice: dto.productPrice,
        shippingCost: dto.shippingCost,
      },
      include: {
        campaign: true,
        tester: true,
      },
    });

    await this.logsService.logSuccess(
      LogCategory.SESSION,
      `✅ Preuve d'achat soumise pour la session ${sessionId}`,
      {
        sessionId,
        orderNumber: dto.orderNumber,
        productPrice: dto.productPrice,
        shippingCost: dto.shippingCost,
      },
    );

    return updatedSession;
  }

  /**
   * 5. Soumettre le test complété (USER testeur uniquement)
   */
  async submitTest(
    sessionId: string,
    userId: string,
    dto: SubmitTestDto,
  ): Promise<PrismaSessionResponse> {
    const session = await this.prisma.session.findUnique({
      where: { id: sessionId },
      include: { campaign: true },
    });

    if (!session) {
      throw new NotFoundException('Session not found');
    }

    // Vérifier que c'est bien le testeur
    if (session.testerId !== userId) {
      throw new ForbiddenException('Access denied');
    }

    // Vérifier que la session est IN_PROGRESS
    if (session.status !== SessionStatus.IN_PROGRESS) {
      throw new BadRequestException(
        'Session must be IN_PROGRESS to submit test',
      );
    }

    const updatedSession = await this.prisma.session.update({
      where: { id: sessionId },
      data: {
        status: SessionStatus.SUBMITTED,
        submittedAt: new Date(),
        submissionData: dto.submissionData as Prisma.JsonObject,
      },
      include: {
        campaign: true,
        tester: true,
      },
    });

    await this.logsService.logSuccess(
      LogCategory.SESSION,
      `✅ Test soumis pour validation (session ${sessionId})`,
      {
        sessionId,
        submittedAt: new Date(),
      },
    );

    return updatedSession;
  }

  /**
   * 6. Valider un test et noter le testeur (PRO uniquement - propriétaire de la campagne)
   */
  async validateTest(
    sessionId: string,
    userId: string,
    dto: ValidateTestDto,
    isAdmin: boolean,
  ): Promise<PrismaSessionResponse> {
    const session = await this.prisma.session.findUnique({
      where: { id: sessionId },
      include: {
        campaign: {
          include: {
            offers: {
              include: {
                product: true,
              },
            },
          },
        },
      },
    });

    if (!session) {
      throw new NotFoundException('Session not found');
    }

    // Vérifier ownership
    if (!isAdmin && session.campaign.sellerId !== userId) {
      throw new ForbiddenException('Access denied');
    }

    // Vérifier que la session est SUBMITTED
    if (session.status !== SessionStatus.SUBMITTED) {
      throw new BadRequestException('Session must be SUBMITTED to validate');
    }

    // Calculer le montant de la récompense (bonus)
    // (Prendre le bonus de la première offre de la campagne)
    let rewardAmount = 0;
    if (session.campaign.offers.length > 0) {
      const firstOffer = session.campaign.offers[0];
      rewardAmount = firstOffer.bonus ? Number(firstOffer.bonus) : 0;
    }

    const updatedSession = await this.prisma.session.update({
      where: { id: sessionId },
      data: {
        status: SessionStatus.COMPLETED,
        completedAt: new Date(),
        rating: dto.rating,
        ratingComment: dto.ratingComment,
        ratedAt: new Date(),
        rewardAmount,
      },
      include: {
        campaign: true,
        tester: true,
      },
    });

    // Créditer le wallet du testeur si le montant de la récompense est > 0
    if (rewardAmount > 0) {
      try {
        await this.walletsService.creditWallet(
          session.testerId,
          rewardAmount,
          `Récompense pour test validé - Campagne: ${session.campaign.title}`,
          sessionId,
          undefined,
          {
            campaignId: session.campaignId,
            campaignTitle: session.campaign.title,
            rating: dto.rating,
          },
        );

        await this.logsService.logSuccess(
          LogCategory.WALLET,
          `💰 Wallet crédité de ${rewardAmount}€ pour session ${sessionId}`,
          {
            sessionId,
            testerId: session.testerId,
            amount: rewardAmount,
          },
        );
      } catch (error) {
        // Log l'erreur mais ne bloque pas la validation du test
        this.logger.error(
          `Failed to credit wallet for session ${sessionId}: ${error instanceof Error ? error.message : 'Unknown error'}`,
          error instanceof Error ? error.stack : undefined,
        );
        await this.logsService.logError(
          LogCategory.WALLET,
          `❌ Échec du crédit wallet pour session ${sessionId}`,
          {
            sessionId,
            testerId: session.testerId,
            amount: rewardAmount,
            error: error instanceof Error ? error.message : 'Unknown error',
          },
        );
      }
    }

    await this.logsService.logSuccess(
      LogCategory.SESSION,
      `✅ Test validé et payé (session ${sessionId}) - Récompense: ${rewardAmount}€`,
      {
        sessionId,
        rating: dto.rating,
        rewardAmount,
      },
    );

    return updatedSession;
  }

  /**
   * 7. Annuler une session (USER testeur uniquement)
   */
  async cancelSession(
    sessionId: string,
    userId: string,
    dto: CancelSessionDto,
  ): Promise<PrismaSessionResponse> {
    const session = await this.prisma.session.findUnique({
      where: { id: sessionId },
      include: { campaign: true },
    });

    if (!session) {
      throw new NotFoundException('Session not found');
    }

    // Vérifier que c'est bien le testeur
    if (session.testerId !== userId) {
      throw new ForbiddenException('Access denied');
    }

    // Ne peut pas annuler si déjà COMPLETED, CANCELLED ou DISPUTED
    const nonCancellableStatuses: SessionStatus[] = [
      SessionStatus.COMPLETED,
      SessionStatus.CANCELLED,
      SessionStatus.DISPUTED,
    ];
    if (nonCancellableStatuses.includes(session.status)) {
      throw new BadRequestException('Cannot cancel session in current status');
    }

    // Si la session était ACCEPTED, rendre le slot disponible
    const shouldRestoreSlot =
      session.status === SessionStatus.ACCEPTED ||
      session.status === SessionStatus.IN_PROGRESS;

    const operations: any[] = [
      this.prisma.session.update({
        where: { id: sessionId },
        data: {
          status: SessionStatus.CANCELLED,
          cancelledAt: new Date(),
          cancellationReason: dto.reason,
        },
        include: {
          campaign: true,
          tester: true,
        },
      }),
    ];

    if (shouldRestoreSlot) {
      operations.push(
        this.prisma.campaign.update({
          where: { id: session.campaignId },
          data: {
            availableSlots: {
              increment: 1,
            },
          },
        }),
      );
    }

    const [updatedSession] = await this.prisma.$transaction(operations);

    await this.logsService.logWarning(
      LogCategory.SESSION,
      `⚠️ Session annulée par le testeur (session ${sessionId})`,
      {
        sessionId,
        reason: dto.reason,
        slotRestored: shouldRestoreSlot,
      },
    );

    return updatedSession;
  }

  /**
   * 8. Créer un litige (testeur ou vendeur)
   */
  async createDispute(
    sessionId: string,
    userId: string,
    dto: DisputeSessionDto,
    userRole: string,
  ): Promise<PrismaSessionResponse> {
    const session = await this.prisma.session.findUnique({
      where: { id: sessionId },
      include: { campaign: true },
    });

    if (!session) {
      throw new NotFoundException('Session not found');
    }

    // Vérifier que l'utilisateur est soit le testeur soit le vendeur
    const isTester = session.testerId === userId;
    const isSeller = session.campaign.sellerId === userId;
    const isAdmin = userRole === 'ADMIN';

    if (!isTester && !isSeller && !isAdmin) {
      throw new ForbiddenException('Access denied');
    }

    const updatedSession = await this.prisma.session.update({
      where: { id: sessionId },
      data: {
        status: SessionStatus.DISPUTED,
        disputedAt: new Date(),
        disputeReason: dto.reason,
      },
      include: {
        campaign: true,
        tester: true,
      },
    });

    await this.logsService.logWarning(
      LogCategory.SESSION,
      `⚠️ Litige créé pour la session ${sessionId}`,
      {
        sessionId,
        reason: dto.reason,
        createdBy: isTester ? 'tester' : 'seller',
      },
    );

    return updatedSession;
  }

  /**
   * 9. Lister les sessions avec filtres
   */
  async findAll(
    userId: string,
    userRole: string,
    filters: SessionFilterDto,
  ): Promise<PrismaSessionResponse[]> {
    const where: Prisma.SessionWhereInput = {};

    // Filtres
    if (filters.status) {
      where.status = filters.status;
    }

    if (filters.campaignId) {
      where.campaignId = filters.campaignId;
    }

    if (filters.testerId) {
      where.testerId = filters.testerId;
    }

    // Restrictions par rôle
    if (userRole === 'USER') {
      // Les testeurs ne voient que leurs propres sessions
      where.testerId = userId;
    } else if (userRole === 'PRO') {
      // Les vendeurs voient les sessions de leurs campagnes
      where.campaign = {
        sellerId: userId,
      };
    }
    // ADMIN voit tout

    const sessions = await this.prisma.session.findMany({
      where,
      include: {
        campaign: {
          select: {
            id: true,
            title: true,
            description: true,
            status: true,
          },
        },
        tester: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            avatar: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: filters.limit,
      skip: filters.offset,
    });

    return sessions;
  }

  /**
   * 10. Détails d'une session
   */
  async findOne(
    sessionId: string,
    userId: string,
    userRole: string,
  ): Promise<PrismaSessionResponse> {
    const session = await this.prisma.session.findUnique({
      where: { id: sessionId },
      include: {
        campaign: {
          include: {
            seller: {
              select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
                companyName: true,
              },
            },
            offers: {
              include: {
                product: true,
              },
            },
          },
        },
        tester: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            avatar: true,
          },
        },
      },
    });

    if (!session) {
      throw new NotFoundException('Session not found');
    }

    // Vérifier les permissions
    const isTester = session.testerId === userId;
    const isSeller = session.campaign.sellerId === userId;
    const isAdmin = userRole === 'ADMIN';

    if (!isTester && !isSeller && !isAdmin) {
      throw new ForbiddenException('Access denied');
    }

    return session;
  }

  /**
   * 11. Supprimer une session (ADMIN uniquement)
   */
  async remove(sessionId: string): Promise<{ message: string }> {
    const session = await this.prisma.session.findUnique({
      where: { id: sessionId },
    });

    if (!session) {
      throw new NotFoundException('Session not found');
    }

    await this.prisma.session.delete({
      where: { id: sessionId },
    });

    await this.logsService.logWarning(
      LogCategory.SESSION,
      `⚠️ Session supprimée par admin: ${sessionId}`,
      { sessionId },
    );

    return { message: 'Session deleted successfully' };
  }
}
