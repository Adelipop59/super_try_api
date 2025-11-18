import {
  Controller,
  Post,
  Get,
  Patch,
  Param,
  Body,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { ReviewsService } from './reviews.service';
import { CreateReviewDto } from './dto/create-review.dto';
import { ReviewResponseDto } from './dto/review-response.dto';
import { SupabaseAuthGuard } from '../../common/guards/supabase-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserRole } from '@prisma/client';

@ApiTags('reviews')
@Controller('reviews')
@UseGuards(SupabaseAuthGuard, RolesGuard)
@ApiBearerAuth()
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Post('sessions/:sessionId')
  @Roles(UserRole.USER)
  @ApiOperation({
    summary: 'Créer un avis pour une session (testeur uniquement)',
  })
  @ApiResponse({
    status: 201,
    description: 'Avis créé avec succès',
    type: ReviewResponseDto,
  })
  async createReview(
    @Param('sessionId') sessionId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: CreateReviewDto,
  ) {
    return this.reviewsService.createReview(sessionId, userId, dto);
  }

  @Get('campaigns/:campaignId')
  @ApiOperation({ summary: "Obtenir tous les avis d'une campagne" })
  @ApiResponse({
    status: 200,
    description: 'Liste des avis de la campagne',
    type: [ReviewResponseDto],
  })
  async getCampaignReviews(@Param('campaignId') campaignId: string) {
    return this.reviewsService.getCampaignReviews(campaignId);
  }

  @Get('campaigns/:campaignId/stats')
  @ApiOperation({ summary: "Obtenir les statistiques d'avis d'une campagne" })
  @ApiResponse({
    status: 200,
    description: 'Statistiques des avis',
  })
  async getCampaignReviewStats(@Param('campaignId') campaignId: string) {
    return this.reviewsService.getCampaignReviewStats(campaignId);
  }

  @Get('products/:productId')
  @ApiOperation({
    summary: "Obtenir tous les avis d'un produit (agrégés par campagne)",
  })
  @ApiResponse({
    status: 200,
    description: 'Avis du produit groupés par campagne',
  })
  async getProductReviews(@Param('productId') productId: string) {
    return this.reviewsService.getProductReviews(productId);
  }

  @Patch(':reviewId/accept-republish')
  @Roles(UserRole.USER)
  @ApiOperation({
    summary: "Accepter la proposition de republication de l'avis",
  })
  @ApiResponse({
    status: 200,
    description: 'Republication acceptée',
    type: ReviewResponseDto,
  })
  async acceptRepublish(
    @Param('reviewId') reviewId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.reviewsService.acceptRepublish(reviewId, userId);
  }

  @Patch(':reviewId/decline-republish')
  @Roles(UserRole.USER)
  @ApiOperation({
    summary: "Refuser la proposition de republication de l'avis",
  })
  @ApiResponse({
    status: 200,
    description: 'Republication refusée',
    type: ReviewResponseDto,
  })
  async declineRepublish(
    @Param('reviewId') reviewId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.reviewsService.declineRepublish(reviewId, userId);
  }
}
