import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateCriteriaTemplateDto } from './dto/create-criteria-template.dto';
import { UpdateCriteriaTemplateDto } from './dto/update-criteria-template.dto';
import { CriteriaTemplateResponseDto } from './dto/criteria-template-response.dto';
import {
  createPaginatedResponse,
  calculateOffset,
  type PaginatedResponse,
} from '../../common/dto/pagination.dto';

@Injectable()
export class CriteriaTemplatesService {
  constructor(private prismaService: PrismaService) {}

  /**
   * Create a new criteria template
   */
  async create(
    sellerId: string,
    dto: CreateCriteriaTemplateDto,
  ): Promise<CriteriaTemplateResponseDto> {
    const template = await this.prismaService.criteriaTemplate.create({
      data: {
        sellerId,
        ...dto,
      },
    });

    return this.formatResponse(template);
  }

  /**
   * Find all templates for a seller with pagination
   */
  async findAllBySeller(
    sellerId: string,
    page: number = 1,
    limit: number = 20,
  ): Promise<PaginatedResponse<CriteriaTemplateResponseDto>> {
    const offset = calculateOffset(page, limit);

    const [templates, total] = await Promise.all([
      this.prismaService.criteriaTemplate.findMany({
        where: { sellerId },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      this.prismaService.criteriaTemplate.count({
        where: { sellerId },
      }),
    ]);

    const data = templates.map((t) => this.formatResponse(t));

    return createPaginatedResponse(data, total, page, limit);
  }

  /**
   * Find one template by ID
   */
  async findOne(
    id: string,
    sellerId: string,
  ): Promise<CriteriaTemplateResponseDto> {
    const template = await this.prismaService.criteriaTemplate.findUnique({
      where: { id },
    });

    if (!template) {
      throw new NotFoundException(`Criteria template with ID ${id} not found`);
    }

    if (template.sellerId !== sellerId) {
      throw new ForbiddenException(
        'You can only access your own criteria templates',
      );
    }

    return this.formatResponse(template);
  }

  /**
   * Update a template
   */
  async update(
    id: string,
    sellerId: string,
    dto: UpdateCriteriaTemplateDto,
  ): Promise<CriteriaTemplateResponseDto> {
    const template = await this.prismaService.criteriaTemplate.findUnique({
      where: { id },
    });

    if (!template) {
      throw new NotFoundException(`Criteria template with ID ${id} not found`);
    }

    if (template.sellerId !== sellerId) {
      throw new ForbiddenException(
        'You can only update your own criteria templates',
      );
    }

    const updated = await this.prismaService.criteriaTemplate.update({
      where: { id },
      data: dto,
    });

    return this.formatResponse(updated);
  }

  /**
   * Delete a template
   */
  async remove(id: string, sellerId: string): Promise<{ message: string }> {
    const template = await this.prismaService.criteriaTemplate.findUnique({
      where: { id },
    });

    if (!template) {
      throw new NotFoundException(`Criteria template with ID ${id} not found`);
    }

    if (template.sellerId !== sellerId) {
      throw new ForbiddenException(
        'You can only delete your own criteria templates',
      );
    }

    await this.prismaService.criteriaTemplate.delete({
      where: { id },
    });

    return { message: 'Criteria template deleted successfully' };
  }

  /**
   * Apply a template to a campaign's criteria
   */
  async applyToCampaign(
    templateId: string,
    campaignId: string,
    sellerId: string,
  ): Promise<{ message: string }> {
    // Verify template ownership
    const template = await this.prismaService.criteriaTemplate.findUnique({
      where: { id: templateId },
    });

    if (!template) {
      throw new NotFoundException(
        `Criteria template with ID ${templateId} not found`,
      );
    }

    if (template.sellerId !== sellerId) {
      throw new ForbiddenException(
        'You can only use your own criteria templates',
      );
    }

    // Verify campaign ownership
    const campaign = await this.prismaService.campaign.findUnique({
      where: { id: campaignId },
    });

    if (!campaign) {
      throw new NotFoundException(`Campaign with ID ${campaignId} not found`);
    }

    if (campaign.sellerId !== sellerId) {
      throw new ForbiddenException(
        'You can only apply templates to your own campaigns',
      );
    }

    // Check if criteria already exist for this campaign
    const existingCriteria =
      await this.prismaService.campaignCriteria.findUnique({
        where: { campaignId },
      });

    // Prepare criteria data from template (exclude id, sellerId, name, timestamps)
    const criteriaData = {
      minAge: template.minAge,
      maxAge: template.maxAge,
      minRating: template.minRating,
      maxRating: template.maxRating,
      minCompletedSessions: template.minCompletedSessions,
      requiredGender: template.requiredGender,
      requiredCountries: template.requiredCountries,
      requiredLocations: template.requiredLocations,
      excludedLocations: template.excludedLocations,
      requiredCategories: template.requiredCategories,
      noActiveSessionWithSeller: template.noActiveSessionWithSeller,
      maxSessionsPerWeek: template.maxSessionsPerWeek,
      maxSessionsPerMonth: template.maxSessionsPerMonth,
      minCompletionRate: template.minCompletionRate,
      maxCancellationRate: template.maxCancellationRate,
      minAccountAge: template.minAccountAge,
      lastActiveWithinDays: template.lastActiveWithinDays,
      requireVerified: template.requireVerified,
      requirePrime: template.requirePrime,
    };

    if (existingCriteria) {
      // Update existing criteria
      await this.prismaService.campaignCriteria.update({
        where: { campaignId },
        data: criteriaData,
      });
    } else {
      // Create new criteria
      await this.prismaService.campaignCriteria.create({
        data: {
          campaignId,
          ...criteriaData,
        },
      });
    }

    return {
      message: `Criteria template "${template.name}" applied to campaign successfully`,
    };
  }

  /**
   * Format template response
   */
  private formatResponse(template: any): CriteriaTemplateResponseDto {
    return {
      id: template.id,
      sellerId: template.sellerId,
      name: template.name,
      minAge: template.minAge,
      maxAge: template.maxAge,
      minRating: template.minRating?.toString() ?? null,
      maxRating: template.maxRating?.toString() ?? null,
      minCompletedSessions: template.minCompletedSessions,
      requiredGender: template.requiredGender,
      requiredCountries: template.requiredCountries,
      requiredLocations: template.requiredLocations,
      excludedLocations: template.excludedLocations,
      requiredCategories: template.requiredCategories,
      noActiveSessionWithSeller: template.noActiveSessionWithSeller,
      maxSessionsPerWeek: template.maxSessionsPerWeek,
      maxSessionsPerMonth: template.maxSessionsPerMonth,
      minCompletionRate: template.minCompletionRate?.toString() ?? null,
      maxCancellationRate: template.maxCancellationRate?.toString() ?? null,
      minAccountAge: template.minAccountAge,
      lastActiveWithinDays: template.lastActiveWithinDays,
      requireVerified: template.requireVerified,
      requirePrime: template.requirePrime,
      createdAt: template.createdAt,
      updatedAt: template.updatedAt,
    };
  }
}
