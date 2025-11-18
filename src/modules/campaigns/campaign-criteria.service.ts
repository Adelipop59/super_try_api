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
        requiredCategories: dto.requiredCategories ?? [],
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
        requiredCategories: dto.requiredCategories,
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

    // Vérifier la localisation
    if (criteria.requiredLocations.length > 0) {
      if (!tester.location) {
        reasons.push('Localisation non renseignée');
      } else if (!criteria.requiredLocations.includes(tester.location)) {
        reasons.push(
          `Localisation requise: ${criteria.requiredLocations.join(', ')}`,
        );
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
      requiredCategories: criteria.requiredCategories,
      createdAt: criteria.createdAt,
      updatedAt: criteria.updatedAt,
    };
  }
}
