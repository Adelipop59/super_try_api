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
import { StripeService } from '../stripe/stripe.service';
import { LogCategory, SessionStatus, Prisma, TransactionType, TransactionStatus, StepType } from '@prisma/client';
import { CampaignCriteriaService } from '../campaigns/campaign-criteria.service';
import { ApplySessionDto } from './dto/apply-session.dto';
import { RejectSessionDto } from './dto/reject-session.dto';
import { SubmitPurchaseDto } from './dto/submit-purchase.dto';
import { SubmitTestDto } from './dto/submit-test.dto';
import { ValidateTestDto } from './dto/validate-test.dto';
import { RateTesterDto } from './dto/rate-tester.dto';
import { CancelSessionDto } from './dto/cancel-session.dto';
import { DisputeSessionDto } from './dto/dispute-session.dto';
import { SessionFilterDto } from './dto/session-filter.dto';
import {
  calculateNextPurchaseDateSmart,
  isValidPurchaseDate,
  isPurchaseDeadlineExpired,
  getTimeUntilDeadline,
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
    private readonly stripeService: StripeService,
    private readonly campaignCriteriaService: CampaignCriteriaService,
  ) {}

  /**
   * 1. Postuler à une campagne (USER uniquement)
   */
  async applyToCampaign(
    userId: string,
    dto: ApplySessionDto,
  ): Promise<PrismaSessionResponse> {
    // Note: Les vérifications KYC et isActive sont déjà faites par les Guards:
    // - SupabaseAuthGuard vérifie isActive
    // - KycVerifiedGuard vérifie verificationStatus === 'verified'

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

    // Vérifier l'éligibilité du testeur selon les critères de la campagne
    const eligibility = await this.campaignCriteriaService.checkTesterEligibility(
      dto.campaignId,
      userId,
    );

    if (!eligibility.eligible) {
      throw new BadRequestException(
        `Vous n'êtes pas éligible pour cette campagne: ${eligibility.reasons.join(', ')}`,
      );
    }

    // Déterminer le statut initial selon le mode d'acceptation
    const initialStatus = campaign.autoAcceptApplications
      ? SessionStatus.ACCEPTED
      : SessionStatus.PENDING;

    // Si auto-accept, calculer la date d'achat intelligemment
    let scheduledPurchaseDate: Date | null = null;
    if (campaign.autoAcceptApplications) {
      const distributions = await this.prisma.distribution.findMany({
        where: { campaignId: dto.campaignId, isActive: true },
      });
      scheduledPurchaseDate = await calculateNextPurchaseDateSmart(
        distributions,
        dto.campaignId,
        this.prisma,
      );
    }

    // Créer la session avec transaction pour décrémenter les slots si auto-accept
    let session: any;

    if (campaign.autoAcceptApplications && campaign.availableSlots > 0) {
      // Mode auto-accept: créer en ACCEPTED et décrémenter les slots
      [session] = await this.prisma.$transaction([
        this.prisma.session.create({
          data: {
            campaignId: dto.campaignId,
            testerId: userId,
            applicationMessage: dto.applicationMessage,
            status: initialStatus,
            acceptedAt: new Date(),
            scheduledPurchaseDate,
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
        }),
        this.prisma.campaign.update({
          where: { id: dto.campaignId },
          data: {
            availableSlots: { decrement: 1 },
          },
        }),
      ]);

      await this.logsService.logSuccess(
        LogCategory.SESSION,
        `✅ Candidature auto-acceptée pour la campagne "${campaign.title}"`,
        {
          sessionId: session.id,
          testerId: userId,
          campaignId: dto.campaignId,
          scheduledPurchaseDate,
        },
      );
    } else {
      // Mode manuel: créer en PENDING
      session = await this.prisma.session.create({
        data: {
          campaignId: dto.campaignId,
          testerId: userId,
          applicationMessage: dto.applicationMessage,
          status: initialStatus,
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
    }

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

    // Calculer la prochaine date d'achat intelligemment basée sur les distributions
    const scheduledPurchaseDate = await calculateNextPurchaseDateSmart(
      session.campaign.distributions,
      session.campaignId,
      this.prisma,
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
              procedures: {
                include: {
                  steps: {
                    orderBy: {
                      order: 'asc',
                    },
                  },
                },
                orderBy: {
                  order: 'asc',
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
          stepProgress: true,
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

    // Vérifier que la session est PROCEDURES_COMPLETED
    if (session.status !== SessionStatus.PROCEDURES_COMPLETED) {
      throw new BadRequestException(
        'You must complete all procedures before validating the price',
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

    // Utiliser priceRangeMin et priceRangeMax de l'offre
    // Ces valeurs sont calculées lors de la création de la campagne
    // basées sur le expectedPrice (prix du produit)
    const minPrice = Number(offer.priceRangeMin);
    const maxPrice = Number(offer.priceRangeMax);
    const expectedPrice = Number(offer.expectedPrice);

    // Vérifier d'abord que le prix est dans la tranche (pour guider le testeur)
    if (productPrice < minPrice || productPrice > maxPrice) {
      await this.logsService.logWarning(
        LogCategory.SESSION,
        `❌ Prix hors fourchette pour session ${sessionId}: ${productPrice}€ (fourchette: ${minPrice}€ - ${maxPrice}€)`,
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

    // Vérifier que le prix saisi est EXACTEMENT le prix attendu
    if (productPrice !== expectedPrice) {
      await this.logsService.logWarning(
        LogCategory.SESSION,
        `❌ Prix inexact pour session ${sessionId}: ${productPrice}€ (attendu exactement: ${expectedPrice}€)`,
        {
          sessionId,
          enteredPrice: productPrice,
          expectedPrice: expectedPrice,
        },
      );

      throw new BadRequestException(
        `Prix incorrect. Vérifiez que vous êtes bien sur le bon produit, ou contactez le vendeur pour plus d'aide.`,
      );
    }

    // Valider et stocker le prix + transition vers PRICE_VALIDATED
    const updatedSession = await this.prisma.session.update({
      where: { id: sessionId },
      data: {
        validatedProductPrice: productPrice,
        priceValidatedAt: new Date(),
        status: SessionStatus.PRICE_VALIDATED,
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

    // Vérifier que la session est PRICE_VALIDATED
    if (session.status !== SessionStatus.PRICE_VALIDATED) {
      throw new BadRequestException(
        'You must validate the product price before submitting purchase',
      );
    }

    // Vérifier que le prix du produit a été validé
    if (!session.validatedProductPrice) {
      throw new BadRequestException(
        'Product price must be validated',
      );
    }

    // Vérifier que l'achat est fait au bon jour (si scheduledPurchaseDate est défini)
    if (session.scheduledPurchaseDate) {
      // Vérifier si la deadline est dépassée (fin du jour prévu = 23:59:59)
      if (isPurchaseDeadlineExpired(session.scheduledPurchaseDate)) {
        const formattedDate = formatDate(session.scheduledPurchaseDate);
        await this.logsService.logWarning(
          LogCategory.SESSION,
          `⏰ Deadline d'achat dépassée pour session ${sessionId} (date prévue: ${formattedDate})`,
          {
            sessionId,
            scheduledDate: session.scheduledPurchaseDate,
            currentDate: new Date(),
          },
        );

        throw new BadRequestException(
          `Purchase deadline expired. You were supposed to purchase on ${formattedDate}. Please contact the seller for assistance.`,
        );
      }

      // Vérifier que c'est le bon jour
      if (!isValidPurchaseDate(session.scheduledPurchaseDate)) {
        const formattedDate = formatDate(session.scheduledPurchaseDate);
        const timeRemaining = getTimeUntilDeadline(session.scheduledPurchaseDate);

        if (timeRemaining) {
          throw new BadRequestException(
            `You must purchase the product on the scheduled date: ${formattedDate}. Time remaining: ${timeRemaining.hours}h ${timeRemaining.minutes}m`,
          );
        } else {
          throw new BadRequestException(
            `You must purchase the product on the scheduled date: ${formattedDate}`,
          );
        }
      }
    }

    const updatedSession = await this.prisma.session.update({
      where: { id: sessionId },
      data: {
        status: SessionStatus.PURCHASE_SUBMITTED,
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

    // Vérifier que la session est PURCHASE_VALIDATED ou IN_PROGRESS
    if (
      session.status !== SessionStatus.PURCHASE_VALIDATED &&
      session.status !== SessionStatus.IN_PROGRESS
    ) {
      throw new BadRequestException(
        'Session must be PURCHASE_VALIDATED or IN_PROGRESS to submit test',
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

    // Payer le testeur via Stripe Transfer si le montant de la récompense est > 0
    if (rewardAmount > 0) {
      try {
        // Vérifier que le testeur a un compte Stripe Connect
        const testerProfile = await this.prisma.profile.findUnique({
          where: { id: session.testerId },
          select: { stripeAccountId: true },
        });

        if (!testerProfile?.stripeAccountId) {
          // Si pas de compte Stripe, crédit wallet (fallback)
          this.logger.warn(
            `Testeur ${session.testerId} n'a pas de compte Stripe Connect, fallback vers wallet`,
          );
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
              note: 'Fallback wallet - Stripe Connect non configuré',
            },
          );

          await this.logsService.logWarning(
            LogCategory.WALLET,
            `⚠️ Wallet crédité (fallback) de ${rewardAmount}€ pour session ${sessionId}`,
            {
              sessionId,
              testerId: session.testerId,
              amount: rewardAmount,
              reason: 'No Stripe Connect account',
            },
          );
        } else {
          // ✅ Récupérer le compte Stripe Connect du vendeur (PRO)
          const sellerProfile = await this.prisma.profile.findUnique({
            where: { id: session.campaign.sellerId },
            select: { stripeAccountId: true },
          });

          if (!sellerProfile?.stripeAccountId) {
            throw new BadRequestException(
              `Le vendeur n'a pas de compte Stripe Connect configuré. ` +
              `Impossible de transférer les fonds au testeur.`
            );
          }

          // ✅ Créer un Stripe Transfer DEPUIS le compte PRO vers le testeur
          const transfer = await this.stripeService.createTesterTransfer(
            testerProfile.stripeAccountId,
            rewardAmount,
            sessionId,
            session.campaign.title,
            sellerProfile.stripeAccountId, // ✅ NOUVEAU
          );

          // Créer une transaction en BDD pour traçabilité
          await this.prisma.transaction.create({
            data: {
              sessionId,
              type: TransactionType.CREDIT,
              amount: rewardAmount,
              reason: `Paiement test validé - Campagne: ${session.campaign.title}`,
              status: TransactionStatus.COMPLETED,
              metadata: {
                stripeTransferId: transfer.id,
                campaignId: session.campaignId,
                campaignTitle: session.campaign.title,
                rating: dto.rating,
                testerStripeAccountId: testerProfile.stripeAccountId,
              },
            },
          });

          await this.logsService.logSuccess(
            LogCategory.WALLET,
            `💰 Stripe Transfer créé de ${rewardAmount}€ pour session ${sessionId}`,
            {
              sessionId,
              testerId: session.testerId,
              amount: rewardAmount,
              stripeTransferId: transfer.id,
              stripeAccountId: testerProfile.stripeAccountId,
            },
          );
        }
      } catch (error) {
        // Log l'erreur mais ne bloque pas la validation du test
        this.logger.error(
          `Failed to pay tester for session ${sessionId}: ${error instanceof Error ? error.message : 'Unknown error'}`,
          error instanceof Error ? error.stack : undefined,
        );
        await this.logsService.logError(
          LogCategory.WALLET,
          `❌ Échec du paiement testeur pour session ${sessionId}`,
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
   * 6.1 Noter un testeur quand la campagne est terminée (PRO uniquement)
   * Permet de noter un testeur même si la session n'est pas encore COMPLETED
   */
  async rateTester(
    sessionId: string,
    userId: string,
    dto: RateTesterDto,
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

    // Vérifier que la campagne est terminée (status COMPLETED ou endDate dépassée)
    const campaignEnded =
      session.campaign.status === 'COMPLETED' ||
      (session.campaign.endDate && session.campaign.endDate < new Date());

    if (!campaignEnded) {
      throw new BadRequestException(
        'Campaign must be completed to rate tester early',
      );
    }

    // Vérifier que la session est dans un état permettant la notation
    const ratableStatuses: SessionStatus[] = [
      SessionStatus.IN_PROGRESS,
      SessionStatus.SUBMITTED,
      SessionStatus.COMPLETED,
    ];
    if (!ratableStatuses.includes(session.status)) {
      throw new BadRequestException(
        'Session must be IN_PROGRESS, SUBMITTED, or COMPLETED to rate tester',
      );
    }

    // Vérifier que le testeur n'a pas déjà été noté
    if (session.rating !== null) {
      throw new BadRequestException(
        'Tester has already been rated. Use updateTesterRating to modify.',
      );
    }

    const updatedSession = await this.prisma.session.update({
      where: { id: sessionId },
      data: {
        rating: dto.rating,
        ratingComment: dto.ratingComment,
        ratedAt: new Date(),
      },
      include: {
        campaign: true,
        tester: true,
      },
    });

    await this.logsService.logSuccess(
      LogCategory.SESSION,
      `✅ Testeur noté (session ${sessionId}) - Note: ${dto.rating}/5`,
      {
        sessionId,
        rating: dto.rating,
        ratingComment: dto.ratingComment,
      },
    );

    return updatedSession;
  }

  /**
   * 6.2 Modifier la notation d'un testeur (PRO uniquement)
   */
  async updateTesterRating(
    sessionId: string,
    userId: string,
    dto: RateTesterDto,
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

    // Vérifier que le testeur a déjà été noté
    if (session.rating === null) {
      throw new BadRequestException(
        'Tester has not been rated yet. Use rateTester to create rating.',
      );
    }

    const updatedSession = await this.prisma.session.update({
      where: { id: sessionId },
      data: {
        rating: dto.rating,
        ratingComment: dto.ratingComment,
        ratedAt: new Date(),
      },
      include: {
        campaign: true,
        tester: true,
      },
    });

    await this.logsService.logSuccess(
      LogCategory.SESSION,
      `✅ Note du testeur modifiée (session ${sessionId}) - Nouvelle note: ${dto.rating}/5`,
      {
        sessionId,
        rating: dto.rating,
        ratingComment: dto.ratingComment,
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
            procedures: {
              include: {
                steps: {
                  orderBy: {
                    order: 'asc',
                  },
                },
              },
              orderBy: {
                order: 'asc',
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
        stepProgress: {
          orderBy: {
            createdAt: 'asc',
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: filters.limit,
      skip: filters.offset,
    });

    // Enrichir avec seller au niveau racine pour compatibilité frontend
    const enrichedSessions = sessions.map(session => ({
      ...session,
      seller: session.campaign.seller,
    }));

    return enrichedSessions;
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
            procedures: {
              include: {
                steps: {
                  orderBy: {
                    order: 'asc',
                  },
                },
              },
              orderBy: {
                order: 'asc',
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
        stepProgress: {
          orderBy: {
            createdAt: 'asc',
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

    // Map stepProgress to each step for frontend convenience
    if (session.campaign?.procedures) {
      for (const procedure of session.campaign.procedures) {
        if (procedure.steps) {
          for (const step of procedure.steps) {
            // Find the progress for this step
            const progress = session.stepProgress.find(p => p.stepId === step.id);
            // Add progress to step
            (step as any).progress = progress || null;
          }
        }
      }
    }

    // Ajouter seller au niveau racine pour compatibilité frontend
    const enrichedSession = {
      ...session,
      seller: session.campaign.seller,
    };

    return enrichedSession;
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

  /**
   * 12. Valider l'achat (PRO uniquement)
   * Transition: PURCHASE_SUBMITTED → PURCHASE_VALIDATED
   */
  async validatePurchase(
    sessionId: string,
    userId: string,
    dto: { comment?: string },
  ): Promise<PrismaSessionResponse> {
    // Récupérer la session avec les relations
    const session = await this.prisma.session.findUnique({
      where: { id: sessionId },
      include: {
        campaign: true,
        tester: true,
      },
    });

    if (!session) {
      throw new NotFoundException('Session not found');
    }

    // Vérifier que c'est bien le vendeur de la campagne
    if (session.campaign.sellerId !== userId) {
      throw new ForbiddenException('Only the campaign seller can validate purchases');
    }

    // Vérifier le statut actuel
    if (session.status !== SessionStatus.PURCHASE_SUBMITTED) {
      throw new BadRequestException(
        `Cannot validate purchase. Session must be in PURCHASE_SUBMITTED status. Current status: ${session.status}`,
      );
    }

    // Vérifier que le numéro de commande existe
    if (!session.orderNumber) {
      throw new BadRequestException('Order number is missing');
    }

    // Mettre à jour la session
    const updatedSession = await this.prisma.session.update({
      where: { id: sessionId },
      data: {
        status: SessionStatus.PURCHASE_VALIDATED,
        purchaseValidatedAt: new Date(),
        purchaseValidationComment: dto.comment,
      },
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

    // Log
    await this.logsService.logInfo(
      LogCategory.SESSION,
      `✅ Achat validé pour session ${sessionId}`,
      {
        sessionId,
        sellerId: userId,
        orderNumber: session.orderNumber,
        comment: dto.comment,
      },
    );

    return {
      ...updatedSession,
      seller: updatedSession.campaign.seller,
    };
  }

  /**
   * 13. Rejeter l'achat (PRO uniquement)
   * Transition: PURCHASE_SUBMITTED → PURCHASE_SUBMITTED (reste en attente de correction)
   */
  async rejectPurchase(
    sessionId: string,
    userId: string,
    dto: { rejectionReason: string },
  ): Promise<PrismaSessionResponse> {
    // Récupérer la session avec les relations
    const session = await this.prisma.session.findUnique({
      where: { id: sessionId },
      include: {
        campaign: true,
        tester: true,
      },
    });

    if (!session) {
      throw new NotFoundException('Session not found');
    }

    // Vérifier que c'est bien le vendeur de la campagne
    if (session.campaign.sellerId !== userId) {
      throw new ForbiddenException('Only the campaign seller can reject purchases');
    }

    // Vérifier le statut actuel
    if (session.status !== SessionStatus.PURCHASE_SUBMITTED) {
      throw new BadRequestException(
        `Cannot reject purchase. Session must be in PURCHASE_SUBMITTED status. Current status: ${session.status}`,
      );
    }

    // Mettre à jour la session
    const updatedSession = await this.prisma.session.update({
      where: { id: sessionId },
      data: {
        purchaseRejectionReason: dto.rejectionReason,
        purchaseRejectedAt: new Date(),
      },
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

    // Log
    await this.logsService.logWarning(
      LogCategory.SESSION,
      `❌ Achat rejeté pour session ${sessionId}`,
      {
        sessionId,
        sellerId: userId,
        rejectionReason: dto.rejectionReason,
      },
    );

    return {
      ...updatedSession,
      seller: updatedSession.campaign.seller,
    };
  }

  /**
   * 14. Valider le test et demander des UGC (PRO uniquement)
   * Transition: SUBMITTED → UGC_REQUESTED
   */
  async validateAndRequestUGC(
    sessionId: string,
    userId: string,
    dto: {
      ugcRequests: Array<{
        type: string;
        description: string;
        bonus: number;
        deadline?: string;
      }>;
      rating: number;
      ratingComment?: string;
    },
  ): Promise<PrismaSessionResponse> {
    // Récupérer la session avec les relations
    const session = await this.prisma.session.findUnique({
      where: { id: sessionId },
      include: {
        campaign: true,
        tester: true,
      },
    });

    if (!session) {
      throw new NotFoundException('Session not found');
    }

    // Vérifier que c'est bien le vendeur de la campagne
    if (session.campaign.sellerId !== userId) {
      throw new ForbiddenException(
        'Only the campaign seller can validate and request UGC',
      );
    }

    // Vérifier le statut actuel
    if (session.status !== SessionStatus.SUBMITTED) {
      throw new BadRequestException(
        `Cannot request UGC. Session must be in SUBMITTED status. Current status: ${session.status}`,
      );
    }

    // Vérifier la note
    if (dto.rating < 1 || dto.rating > 5) {
      throw new BadRequestException('Rating must be between 1 and 5');
    }

    // Vérifier qu'il y a au moins une demande UGC
    if (!dto.ugcRequests || dto.ugcRequests.length === 0) {
      throw new BadRequestException('At least one UGC request is required');
    }

    // Calculer le bonus total
    const totalUGCBonus = dto.ugcRequests.reduce(
      (sum, req) => sum + req.bonus,
      0,
    );

    // Mettre à jour la session
    const updatedSession = await this.prisma.session.update({
      where: { id: sessionId },
      data: {
        status: SessionStatus.UGC_REQUESTED,
        rating: dto.rating,
        ratingComment: dto.ratingComment,
        ugcRequests: dto.ugcRequests as any,
        ugcRequestedAt: new Date(),
        potentialUGCBonus: totalUGCBonus,
      },
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

    // Log
    await this.logsService.logInfo(
      LogCategory.SESSION,
      `📹 UGC demandés pour session ${sessionId}`,
      {
        sessionId,
        sellerId: userId,
        ugcCount: dto.ugcRequests.length,
        totalBonus: totalUGCBonus,
        rating: dto.rating,
      },
    );

    return {
      ...updatedSession,
      seller: updatedSession.campaign.seller,
    };
  }

  /**
   * 15. Soumettre les UGC (USER uniquement)
   * Transition: UGC_REQUESTED → UGC_SUBMITTED
   */
  async submitUGC(
    sessionId: string,
    userId: string,
    dto: {
      ugcSubmissions: Array<{
        type: string;
        contentUrl: string;
        comment?: string;
      }>;
      message?: string;
    },
  ): Promise<PrismaSessionResponse> {
    // Récupérer la session avec les relations
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

    // Vérifier que c'est bien le testeur
    if (session.testerId !== userId) {
      throw new ForbiddenException('Only the tester can submit UGC');
    }

    // Vérifier le statut actuel
    if (session.status !== SessionStatus.UGC_REQUESTED) {
      throw new BadRequestException(
        `Cannot submit UGC. Session must be in UGC_REQUESTED status. Current status: ${session.status}`,
      );
    }

    // Vérifier qu'il y a au moins une soumission
    if (!dto.ugcSubmissions || dto.ugcSubmissions.length === 0) {
      throw new BadRequestException('At least one UGC submission is required');
    }

    // Mettre à jour la session
    const updatedSession = await this.prisma.session.update({
      where: { id: sessionId },
      data: {
        status: SessionStatus.UGC_SUBMITTED,
        ugcSubmissions: dto.ugcSubmissions as any,
        ugcSubmittedAt: new Date(),
        ugcSubmissionMessage: dto.message,
      },
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

    // Log
    await this.logsService.logInfo(
      LogCategory.SESSION,
      `📹 UGC soumis pour session ${sessionId}`,
      {
        sessionId,
        testerId: userId,
        submissionCount: dto.ugcSubmissions.length,
      },
    );

    return {
      ...updatedSession,
      seller: updatedSession.campaign.seller,
    };
  }

  /**
   * 16. Refuser de soumettre les UGC (USER uniquement)
   * Transition: UGC_REQUESTED → PENDING_CLOSURE
   */
  async declineUGC(
    sessionId: string,
    userId: string,
    dto: { declineReason: string },
  ): Promise<PrismaSessionResponse> {
    // Récupérer la session avec les relations
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

    // Vérifier que c'est bien le testeur
    if (session.testerId !== userId) {
      throw new ForbiddenException('Only the tester can decline UGC');
    }

    // Vérifier le statut actuel
    if (session.status !== SessionStatus.UGC_REQUESTED) {
      throw new BadRequestException(
        `Cannot decline UGC. Session must be in UGC_REQUESTED status. Current status: ${session.status}`,
      );
    }

    // Mettre à jour la session
    const updatedSession = await this.prisma.session.update({
      where: { id: sessionId },
      data: {
        status: SessionStatus.PENDING_CLOSURE,
        ugcDeclined: true,
        ugcDeclineReason: dto.declineReason,
        ugcDeclinedAt: new Date(),
        potentialUGCBonus: 0, // Pas de bonus si refusé
      },
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

    // Log
    await this.logsService.logWarning(
      LogCategory.SESSION,
      `❌ UGC refusés pour session ${sessionId}`,
      {
        sessionId,
        testerId: userId,
        declineReason: dto.declineReason,
      },
    );

    return {
      ...updatedSession,
      seller: updatedSession.campaign.seller,
    };
  }

  /**
   * 17. Valider les UGC soumis (PRO uniquement)
   * Transition: UGC_SUBMITTED → PENDING_CLOSURE
   */
  async validateUGC(
    sessionId: string,
    userId: string,
    dto: { comment?: string },
  ): Promise<PrismaSessionResponse> {
    // Récupérer la session avec les relations
    const session = await this.prisma.session.findUnique({
      where: { id: sessionId },
      include: {
        campaign: true,
        tester: true,
      },
    });

    if (!session) {
      throw new NotFoundException('Session not found');
    }

    // Vérifier que c'est bien le vendeur de la campagne
    if (session.campaign.sellerId !== userId) {
      throw new ForbiddenException('Only the campaign seller can validate UGC');
    }

    // Vérifier le statut actuel
    if (session.status !== SessionStatus.UGC_SUBMITTED) {
      throw new BadRequestException(
        `Cannot validate UGC. Session must be in UGC_SUBMITTED status. Current status: ${session.status}`,
      );
    }

    // Mettre à jour la session
    const updatedSession = await this.prisma.session.update({
      where: { id: sessionId },
      data: {
        status: SessionStatus.PENDING_CLOSURE,
        ugcValidated: true,
        ugcValidationComment: dto.comment,
        ugcValidatedAt: new Date(),
      },
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

    // Log
    await this.logsService.logInfo(
      LogCategory.SESSION,
      `✅ UGC validés pour session ${sessionId}`,
      {
        sessionId,
        sellerId: userId,
        comment: dto.comment,
      },
    );

    return {
      ...updatedSession,
      seller: updatedSession.campaign.seller,
    };
  }

  /**
   * 18. Rejeter les UGC soumis (PRO uniquement)
   * Transition: UGC_SUBMITTED → UGC_REQUESTED (retour pour correction)
   */
  async rejectUGC(
    sessionId: string,
    userId: string,
    dto: { rejectionReason: string },
  ): Promise<PrismaSessionResponse> {
    // Récupérer la session avec les relations
    const session = await this.prisma.session.findUnique({
      where: { id: sessionId },
      include: {
        campaign: true,
        tester: true,
      },
    });

    if (!session) {
      throw new NotFoundException('Session not found');
    }

    // Vérifier que c'est bien le vendeur de la campagne
    if (session.campaign.sellerId !== userId) {
      throw new ForbiddenException('Only the campaign seller can reject UGC');
    }

    // Vérifier le statut actuel
    if (session.status !== SessionStatus.UGC_SUBMITTED) {
      throw new BadRequestException(
        `Cannot reject UGC. Session must be in UGC_SUBMITTED status. Current status: ${session.status}`,
      );
    }

    // Mettre à jour la session - retour à UGC_REQUESTED pour correction
    const updatedSession = await this.prisma.session.update({
      where: { id: sessionId },
      data: {
        status: SessionStatus.UGC_REQUESTED,
        ugcRejectionReason: dto.rejectionReason,
        ugcRejectedAt: new Date(),
      },
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

    // Log
    await this.logsService.logWarning(
      LogCategory.SESSION,
      `❌ UGC rejetés pour session ${sessionId}`,
      {
        sessionId,
        sellerId: userId,
        rejectionReason: dto.rejectionReason,
      },
    );

    return {
      ...updatedSession,
      seller: updatedSession.campaign.seller,
    };
  }

  /**
   * 19. Clôturer la session (PRO uniquement)
   * Transition: PENDING_CLOSURE → COMPLETED
   */
  async closeSession(
    sessionId: string,
    userId: string,
    dto: { closingMessage?: string },
  ): Promise<PrismaSessionResponse> {
    // Récupérer la session avec les relations
    const session = await this.prisma.session.findUnique({
      where: { id: sessionId },
      include: {
        campaign: true,
        tester: true,
      },
    });

    if (!session) {
      throw new NotFoundException('Session not found');
    }

    // Vérifier que c'est bien le vendeur de la campagne
    if (session.campaign.sellerId !== userId) {
      throw new ForbiddenException('Only the campaign seller can close sessions');
    }

    // Vérifier le statut actuel
    if (session.status !== SessionStatus.PENDING_CLOSURE) {
      throw new BadRequestException(
        `Cannot close session. Session must be in PENDING_CLOSURE status. Current status: ${session.status}`,
      );
    }

    // Si des UGC ont été validés, payer le bonus via Stripe Transfer
    let finalBonus = 0;
    if (session.ugcValidated && session.potentialUGCBonus) {
      finalBonus = Number(session.potentialUGCBonus);

      try {
        // Vérifier que le testeur a un compte Stripe Connect
        const testerProfile = await this.prisma.profile.findUnique({
          where: { id: session.testerId },
          select: { stripeAccountId: true },
        });

        if (!testerProfile?.stripeAccountId) {
          // Si pas de compte Stripe, crédit wallet (fallback)
          this.logger.warn(
            `Testeur ${session.testerId} n'a pas de compte Stripe Connect pour bonus UGC, fallback vers wallet`,
          );
          await this.walletsService.creditWallet(
            session.testerId,
            finalBonus,
            `Bonus UGC pour session ${sessionId}`,
            sessionId,
            undefined,
            {
              campaignId: session.campaignId,
              campaignTitle: session.campaign.title,
              ugcBonus: finalBonus,
              note: 'Fallback wallet - Stripe Connect non configuré',
            },
          );

          await this.logsService.logWarning(
            LogCategory.WALLET,
            `⚠️ Wallet crédité (fallback) de ${finalBonus}€ pour bonus UGC session ${sessionId}`,
            {
              sessionId,
              testerId: session.testerId,
              amount: finalBonus,
              reason: 'No Stripe Connect account',
            },
          );
        } else {
          // ✅ Récupérer le compte Stripe Connect du vendeur (PRO)
          const sellerProfile = await this.prisma.profile.findUnique({
            where: { id: session.campaign.sellerId },
            select: { stripeAccountId: true },
          });

          if (!sellerProfile?.stripeAccountId) {
            throw new BadRequestException(
              `Le vendeur n'a pas de compte Stripe Connect configuré. ` +
              `Impossible de transférer le bonus UGC au testeur.`,
            );
          }

          // ✅ Créer un Stripe Transfer DEPUIS le compte du PRO vers le testeur
          const transfer = await this.stripeService.createTesterTransfer(
            testerProfile.stripeAccountId,
            finalBonus,
            sessionId,
            `${session.campaign.title} - Bonus UGC`,
            sellerProfile.stripeAccountId, // ✅ Transfer FROM PRO account
          );

          // Créer une transaction en BDD pour traçabilité
          await this.prisma.transaction.create({
            data: {
              sessionId,
              type: TransactionType.UGC_BONUS,
              amount: finalBonus,
              reason: `Bonus UGC validé - Campagne: ${session.campaign.title}`,
              status: TransactionStatus.COMPLETED,
              metadata: {
                stripeTransferId: transfer.id,
                campaignId: session.campaignId,
                campaignTitle: session.campaign.title,
                ugcCount: session.ugcSubmissions ? (session.ugcSubmissions as any).length : 0,
                testerStripeAccountId: testerProfile.stripeAccountId,
              },
            },
          });

          await this.logsService.logSuccess(
            LogCategory.WALLET,
            `💰 Stripe Transfer créé pour bonus UGC de ${finalBonus}€ (session ${sessionId})`,
            {
              sessionId,
              testerId: session.testerId,
              amount: finalBonus,
              stripeTransferId: transfer.id,
              stripeAccountId: testerProfile.stripeAccountId,
            },
          );
        }
      } catch (error) {
        // Log l'erreur mais ne bloque pas la clôture de session
        this.logger.error(
          `Failed to pay UGC bonus for session ${sessionId}: ${error instanceof Error ? error.message : 'Unknown error'}`,
          error instanceof Error ? error.stack : undefined,
        );
        await this.logsService.logError(
          LogCategory.WALLET,
          `❌ Échec du paiement bonus UGC pour session ${sessionId}`,
          {
            sessionId,
            testerId: session.testerId,
            amount: finalBonus,
            error: error instanceof Error ? error.message : 'Unknown error',
          },
        );
      }
    }

    // Mettre à jour la session
    const updatedSession = await this.prisma.session.update({
      where: { id: sessionId },
      data: {
        status: SessionStatus.COMPLETED,
        completedAt: new Date(),
        closingMessage: dto.closingMessage,
        finalUGCBonus: finalBonus,
      },
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

    // Log
    await this.logsService.logInfo(
      LogCategory.SESSION,
      `🎉 Session clôturée ${sessionId}`,
      {
        sessionId,
        sellerId: userId,
        ugcBonus: finalBonus,
        closingMessage: dto.closingMessage,
      },
    );

    return {
      ...updatedSession,
      seller: updatedSession.campaign.seller,
    };
  }

  /**
   * 20. Compléter une étape de test (USER uniquement)
   * Permet au testeur de compléter les étapes une par une
   */
  async completeStep(
    sessionId: string,
    stepId: string,
    userId: string,
    dto: {
      response?: any;
      comment?: string;
      attachments?: string[];
      submissionData?: Record<string, any>;
    },
  ): Promise<any> {
    // Support ancien et nouveau format
    let response: any;
    let comment: string | undefined;
    let attachments: string[] | undefined;

    if (dto.submissionData) {
      // Ancien format: { submissionData: { response, comment, ... } }
      response = dto.submissionData.response;
      comment = dto.submissionData.comment;
      attachments = dto.submissionData.attachments;
    } else {
      // Nouveau format: { response, comment, attachments }
      response = dto.response;
      comment = dto.comment;
      attachments = dto.attachments;
    }

    // Vérifier que response n'est pas undefined ou null
    if (response === undefined || response === null) {
      throw new BadRequestException(
        'Le champ "response" est obligatoire. Envoyer: { "response": "votre réponse" } OU { "submissionData": { "response": "votre réponse" } }',
      );
    }

    // Récupérer la session avec les relations nécessaires
    const session = await this.prisma.session.findUnique({
      where: { id: sessionId },
      include: {
        campaign: {
          include: {
            procedures: {
              include: {
                steps: true,
              },
            },
          },
        },
        stepProgress: true,
      },
    });

    if (!session) {
      throw new NotFoundException('Session not found');
    }

    // Vérifier que c'est bien le testeur
    if (session.testerId !== userId) {
      throw new ForbiddenException('Only the tester can complete steps');
    }

    // Vérifier le statut de la session
    const validStatuses: SessionStatus[] = [
      SessionStatus.ACCEPTED,
      SessionStatus.IN_PROGRESS,
      SessionStatus.PROCEDURES_COMPLETED,
    ];

    if (!validStatuses.includes(session.status as SessionStatus)) {
      throw new BadRequestException(
        `Cannot complete steps. Session must be in ACCEPTED, IN_PROGRESS, or PROCEDURES_COMPLETED status. Current status: ${session.status}`,
      );
    }

    // Trouver l'étape dans les procédures de la campagne
    let step: any = null;
    let procedure: any = null;

    for (const proc of session.campaign.procedures) {
      const foundStep = proc.steps.find((s: any) => s.id === stepId);
      if (foundStep) {
        step = foundStep;
        procedure = proc;
        break;
      }
    }

    if (!step) {
      throw new NotFoundException(
        'Step not found in this campaign\'s procedures',
      );
    }

    // Valider la réponse selon le type d'étape
    this.validateStepResponse(step.type, response);

    // Vérifier si l'étape a déjà été complétée
    const existingProgress = session.stepProgress.find(
      (p: any) => p.stepId === stepId,
    );

    let stepProgressRecord;

    if (existingProgress) {
      // Mettre à jour la progression existante
      stepProgressRecord = await this.prisma.sessionStepProgress.update({
        where: { id: existingProgress.id },
        data: {
          isCompleted: true,
          submissionData: {
            response: dto.response,
            comment: dto.comment,
            attachments: dto.attachments,
          },
          completedAt: new Date(),
        },
      });
    } else {
      // Créer une nouvelle progression
      stepProgressRecord = await this.prisma.sessionStepProgress.create({
        data: {
          sessionId,
          stepId,
          isCompleted: true,
          submissionData: {
            response: dto.response,
            comment: dto.comment,
            attachments: dto.attachments,
          },
          completedAt: new Date(),
        },
      });
    }

    // Vérifier si toutes les étapes obligatoires sont complétées
    const allRequiredStepsCompleted = await this.checkAllRequiredStepsCompleted(
      sessionId,
      session.campaign.procedures,
    );

    // LOG pour debugging
    await this.logsService.logInfo(
      LogCategory.SESSION,
      `🔍 Vérification étapes - Session ${sessionId}: allRequiredStepsCompleted=${allRequiredStepsCompleted}`,
      {
        sessionId,
        completedStepId: stepId,
        allRequiredStepsCompleted,
        currentStatus: session.status,
      },
    );

    // Gérer les transitions de statut selon le contexte
    let newStatus = session.status;

    // Si toutes les étapes sont complétées (incluant PRICE_VALIDATION)
    if (allRequiredStepsCompleted) {
      // Si session en ACCEPTED ou IN_PROGRESS → PROCEDURES_COMPLETED
      if (
        session.status === SessionStatus.ACCEPTED ||
        session.status === SessionStatus.IN_PROGRESS
      ) {
        // Toutes les étapes sont complétées → PROCEDURES_COMPLETED
        newStatus = SessionStatus.PROCEDURES_COMPLETED;

        await this.prisma.session.update({
          where: { id: sessionId },
          data: {
            status: SessionStatus.PROCEDURES_COMPLETED,
          },
        });

        await this.logsService.logInfo(
          LogCategory.SESSION,
          `✅ Toutes les procédures complétées pour session ${sessionId}`,
          { sessionId, testerId: userId },
        );
      }
    } else {
      // Pas toutes les étapes complétées
      // Si première étape et session en ACCEPTED → IN_PROGRESS
      if (session.status === SessionStatus.ACCEPTED) {
        newStatus = SessionStatus.IN_PROGRESS;

        await this.prisma.session.update({
          where: { id: sessionId },
          data: {
            status: SessionStatus.IN_PROGRESS,
          },
        });

        await this.logsService.logInfo(
          LogCategory.SESSION,
          `🚀 Test démarré pour session ${sessionId}`,
          { sessionId, testerId: userId },
        );
      }
    }

    // Log
    await this.logsService.logInfo(
      LogCategory.SESSION,
      `✅ Étape "${step.title}" complétée pour session ${sessionId}`,
      {
        sessionId,
        stepId,
        stepTitle: step.title,
        procedureTitle: procedure.title,
      },
    );

    return {
      stepProgress: stepProgressRecord,
      allRequiredStepsCompleted,
      sessionStatus: newStatus,
    };
  }

  /**
   * Valider la réponse selon le type d'étape
   */
  private validateStepResponse(stepType: string, response: any): void {
    switch (stepType) {
      case 'TEXT':
        if (typeof response !== 'string' || response.trim().length === 0) {
          throw new BadRequestException(
            `TEXT step requires a non-empty string response. Received: ${JSON.stringify(response)} (type: ${typeof response})`,
          );
        }
        break;

      case 'PHOTO':
        if (typeof response !== 'string' || !this.isValidUrl(response)) {
          throw new BadRequestException(
            'PHOTO step requires a valid URL string',
          );
        }
        break;

      case 'VIDEO':
        if (typeof response !== 'string' || !this.isValidUrl(response)) {
          throw new BadRequestException(
            'VIDEO step requires a valid URL string',
          );
        }
        break;

      case 'CHECKLIST':
        if (!Array.isArray(response) || response.length === 0) {
          throw new BadRequestException(
            'CHECKLIST step requires a non-empty array of selected items',
          );
        }
        break;

      case 'RATING':
        if (
          typeof response !== 'number' ||
          response < 1 ||
          response > 5 ||
          !Number.isInteger(response)
        ) {
          throw new BadRequestException(
            'RATING step requires an integer between 1 and 5',
          );
        }
        break;

      default:
        // Type inconnu, on accepte tout
        break;
    }
  }

  /**
   * Vérifier si toutes les étapes obligatoires sont complétées
   */
  private async checkAllRequiredStepsCompleted(
    sessionId: string,
    procedures: any[],
  ): Promise<boolean> {
    // Récupérer toutes les progressions de la session
    const stepProgress = await this.prisma.sessionStepProgress.findMany({
      where: {
        sessionId,
        isCompleted: true,
      },
    });

    const completedStepIds = new Set(
      stepProgress.map((p: any) => p.stepId),
    );

    // Compter les étapes requises et complétées
    let totalRequiredSteps = 0;
    let completedRequiredSteps = 0;

    // Vérifier toutes les procédures
    for (const procedure of procedures) {
      // Si la procédure est optionnelle, on la skip
      if (!procedure.isRequired) {
        continue;
      }

      // Vérifier toutes les étapes obligatoires de cette procédure
      for (const step of procedure.steps) {
        if (step.isRequired) {
          totalRequiredSteps++;
          if (completedStepIds.has(step.id)) {
            completedRequiredSteps++;
          } else {
            // LOG pour debugging
            this.logsService.logInfo(
              LogCategory.SESSION,
              `❌ Étape requise non complétée: "${step.title}" (ID: ${step.id})`,
              { sessionId, stepId: step.id, stepTitle: step.title },
            );
            return false; // Une étape obligatoire n'est pas complétée
          }
        }
      }
    }

    // LOG pour debugging
    await this.logsService.logInfo(
      LogCategory.SESSION,
      `✅ Toutes les étapes requises sont complétées: ${completedRequiredSteps}/${totalRequiredSteps}`,
      { sessionId, totalRequiredSteps, completedRequiredSteps },
    );

    return true; // Toutes les étapes obligatoires sont complétées
  }

  /**
   * Valider une URL
   */
  private isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }
}
