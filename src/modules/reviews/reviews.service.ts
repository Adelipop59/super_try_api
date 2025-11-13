import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateReviewDto } from './dto/create-review.dto';
import { CampaignReview, SessionStatus } from '@prisma/client';

@Injectable()
export class ReviewsService {
  constructor(private prisma: PrismaService) {}

  /**
   * Créer un avis pour une session
   */
  async createReview(
    sessionId: string,
    userId: string,
    dto: CreateReviewDto,
  ): Promise<CampaignReview> {
    // Vérifier que la session existe et est COMPLETED
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

    // Vérifier que c'est bien le testeur de cette session
    if (session.testerId !== userId) {
      throw new ForbiddenException('You can only review your own sessions');
    }

    // Vérifier que la session est terminée
    if (session.status !== SessionStatus.COMPLETED) {
      throw new BadRequestException('You can only review completed sessions');
    }

    // Vérifier qu'il n'y a pas déjà un avis pour cette session
    const existingReview = await this.prisma.campaignReview.findUnique({
      where: { sessionId },
    });

    if (existingReview) {
      throw new BadRequestException('You have already reviewed this session');
    }

    // Obtenir le premier produit de la campagne
    const product = session.campaign.offers[0]?.product;
    if (!product) {
      throw new BadRequestException('No product found for this campaign');
    }

    // Créer l'avis
    const review = await this.prisma.campaignReview.create({
      data: {
        campaignId: session.campaignId,
        productId: product.id,
        testerId: userId,
        sessionId: session.id,
        rating: dto.rating,
        comment: dto.comment,
        isPublic: true,
        // Si la note est >= 3, proposer automatiquement la republication
        republishProposed: dto.rating >= 3,
      },
      include: {
        campaign: true,
        product: true,
        tester: true,
        session: true,
      },
    });

    // Si note >= 3, créer une notification pour proposer la republication
    if (dto.rating >= 3) {
      // TODO: Créer notification via NotificationsService
      // await this.notificationsService.create({
      //   userId,
      //   type: 'REVIEW_REPUBLISH_PROPOSAL',
      //   title: 'Votre avis est positif !',
      //   message: 'Voulez-vous le publier sur le site du vendeur ?',
      // });
    }

    return review;
  }

  /**
   * Obtenir tous les avis d'une campagne
   */
  async getCampaignReviews(campaignId: string): Promise<CampaignReview[]> {
    return this.prisma.campaignReview.findMany({
      where: {
        campaignId,
        isPublic: true,
      },
      include: {
        tester: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatar: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  /**
   * Obtenir tous les avis d'un produit (agrégés par campagne)
   */
  async getProductReviews(productId: string) {
    const reviews = await this.prisma.campaignReview.findMany({
      where: {
        productId,
        isPublic: true,
      },
      include: {
        campaign: {
          select: {
            id: true,
            title: true,
          },
        },
        tester: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatar: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Calculer la note moyenne globale et par campagne
    const totalRating = reviews.reduce((sum, review) => sum + review.rating, 0);
    const averageRating = reviews.length > 0 ? totalRating / reviews.length : 0;

    // Grouper par campagne
    const reviewsByCampaign = reviews.reduce((acc, review) => {
      const campaignId = review.campaignId;
      if (!acc[campaignId]) {
        acc[campaignId] = {
          campaign: review.campaign,
          reviews: [],
          averageRating: 0,
        };
      }
      acc[campaignId].reviews.push(review);
      return acc;
    }, {} as Record<string, any>);

    // Calculer la moyenne par campagne
    Object.values(reviewsByCampaign).forEach((campaignData: any) => {
      const sum = campaignData.reviews.reduce(
        (total: number, review: any) => total + review.rating,
        0,
      );
      campaignData.averageRating = sum / campaignData.reviews.length;
    });

    return {
      productId,
      totalReviews: reviews.length,
      averageRating: Math.round(averageRating * 10) / 10,
      reviewsByCampaign: Object.values(reviewsByCampaign),
      allReviews: reviews,
    };
  }

  /**
   * Accepter la proposition de republication
   */
  async acceptRepublish(reviewId: string, userId: string): Promise<CampaignReview> {
    const review = await this.prisma.campaignReview.findUnique({
      where: { id: reviewId },
    });

    if (!review) {
      throw new NotFoundException('Review not found');
    }

    if (review.testerId !== userId) {
      throw new ForbiddenException('You can only modify your own reviews');
    }

    if (!review.republishProposed) {
      throw new BadRequestException('No republish proposal for this review');
    }

    return this.prisma.campaignReview.update({
      where: { id: reviewId },
      data: {
        republishAccepted: true,
      },
    });
  }

  /**
   * Refuser la proposition de republication
   */
  async declineRepublish(reviewId: string, userId: string): Promise<CampaignReview> {
    const review = await this.prisma.campaignReview.findUnique({
      where: { id: reviewId },
    });

    if (!review) {
      throw new NotFoundException('Review not found');
    }

    if (review.testerId !== userId) {
      throw new ForbiddenException('You can only modify your own reviews');
    }

    if (!review.republishProposed) {
      throw new BadRequestException('No republish proposal for this review');
    }

    return this.prisma.campaignReview.update({
      where: { id: reviewId },
      data: {
        republishAccepted: false,
      },
    });
  }

  /**
   * Obtenir les statistiques d'avis pour une campagne
   */
  async getCampaignReviewStats(campaignId: string) {
    const reviews = await this.prisma.campaignReview.findMany({
      where: { campaignId },
      select: { rating: true },
    });

    const totalReviews = reviews.length;
    if (totalReviews === 0) {
      return {
        totalReviews: 0,
        averageRating: 0,
        ratingDistribution: {
          5: 0,
          4: 0,
          3: 0,
          2: 0,
          1: 0,
        },
      };
    }

    const totalRating = reviews.reduce((sum, review) => sum + review.rating, 0);
    const averageRating = totalRating / totalReviews;

    const ratingDistribution = reviews.reduce(
      (acc, review) => {
        acc[review.rating] = (acc[review.rating] || 0) + 1;
        return acc;
      },
      { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 } as Record<number, number>,
    );

    return {
      totalReviews,
      averageRating: Math.round(averageRating * 10) / 10,
      ratingDistribution,
    };
  }
}
