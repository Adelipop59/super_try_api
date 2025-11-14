import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { LogsService } from '../logs/logs.service';
import { CreateDistributionDto } from './dto/create-distribution.dto';
import { UpdateDistributionDto } from './dto/update-distribution.dto';
import { DistributionResponseDto } from './dto/distribution-response.dto';
import { LogCategory, DistributionType } from '@prisma/client';

@Injectable()
export class DistributionsService {
  private readonly dayNames = [
    'Dimanche',
    'Lundi',
    'Mardi',
    'Mercredi',
    'Jeudi',
    'Vendredi',
    'Samedi',
  ];

  constructor(
    private prismaService: PrismaService,
    private logsService: LogsService,
  ) {}

  /**
   * Créer une distribution
   */
  async create(
    campaignId: string,
    sellerId: string,
    createDistributionDto: CreateDistributionDto,
  ): Promise<DistributionResponseDto> {
    // Vérifier que la campagne existe et appartient au vendeur
    const campaign = await this.prismaService.campaign.findUnique({
      where: { id: campaignId },
    });

    if (!campaign) {
      throw new NotFoundException(`Campaign with ID ${campaignId} not found`);
    }

    if (campaign.sellerId !== sellerId) {
      throw new ForbiddenException(
        'You can only configure distributions for your own campaigns',
      );
    }

    // Validation selon le type
    this.validateDistributionDto(createDistributionDto);

    // Créer la distribution
    const distribution = await this.prismaService.distribution.create({
      data: {
        campaignId,
        type: createDistributionDto.type,
        dayOfWeek: createDistributionDto.dayOfWeek ?? null,
        specificDate: createDistributionDto.specificDate ?? null,
        isActive: createDistributionDto.isActive ?? true,
      },
    });

    const logMessage =
      distribution.type === DistributionType.RECURRING
        ? `✅ [CAMPAIGN] Distribution récurrente créée pour ${this.dayNames[distribution.dayOfWeek!]}`
        : `✅ [CAMPAIGN] Distribution créée pour le ${distribution.specificDate?.toLocaleDateString('fr-FR')}`;

    await this.logsService.logSuccess(
      LogCategory.CAMPAIGN,
      logMessage,
      { distributionId: distribution.id, campaignId },
      sellerId,
    );

    return this.formatResponse(distribution);
  }

  /**
   * Liste des distributions d'une campagne
   */
  async findAll(campaignId: string): Promise<DistributionResponseDto[]> {
    const distributions = await this.prismaService.distribution.findMany({
      where: { campaignId },
      orderBy: [{ type: 'asc' }, { dayOfWeek: 'asc' }, { specificDate: 'asc' }],
    });

    return distributions.map((d) => this.formatResponse(d));
  }

  /**
   * Détails d'une distribution par ID
   */
  async findOne(id: string): Promise<DistributionResponseDto> {
    const distribution = await this.prismaService.distribution.findUnique({
      where: { id },
    });

    if (!distribution) {
      throw new NotFoundException(`Distribution with ID ${id} not found`);
    }

    return this.formatResponse(distribution);
  }

  /**
   * Mettre à jour une distribution
   */
  async update(
    id: string,
    sellerId: string,
    updateDistributionDto: UpdateDistributionDto,
    isAdmin: boolean = false,
  ): Promise<DistributionResponseDto> {
    const distribution = await this.prismaService.distribution.findUnique({
      where: { id },
      include: {
        campaign: true,
      },
    });

    if (!distribution) {
      throw new NotFoundException(`Distribution with ID ${id} not found`);
    }

    if (!isAdmin && distribution.campaign.sellerId !== sellerId) {
      throw new ForbiddenException(
        'You can only update distributions of your own campaigns',
      );
    }

    // Validation si le type change
    if (updateDistributionDto.type) {
      this.validateDistributionDto(updateDistributionDto as CreateDistributionDto);
    }

    const updated = await this.prismaService.distribution.update({
      where: { id },
      data: {
        type: updateDistributionDto.type,
        dayOfWeek: updateDistributionDto.dayOfWeek ?? undefined,
        specificDate: updateDistributionDto.specificDate ?? undefined,
        isActive: updateDistributionDto.isActive,
      },
    });

    await this.logsService.logSuccess(
      LogCategory.CAMPAIGN,
      `✅ [CAMPAIGN] Distribution modifiée`,
      { distributionId: updated.id, campaignId: distribution.campaignId },
      sellerId,
    );

    return this.formatResponse(updated);
  }

  /**
   * Supprimer une distribution
   */
  async remove(
    id: string,
    sellerId: string,
    isAdmin: boolean = false,
  ): Promise<{ message: string }> {
    const distribution = await this.prismaService.distribution.findUnique({
      where: { id },
      include: {
        campaign: true,
      },
    });

    if (!distribution) {
      throw new NotFoundException(`Distribution with ID ${id} not found`);
    }

    if (!isAdmin && distribution.campaign.sellerId !== sellerId) {
      throw new ForbiddenException(
        'You can only delete distributions of your own campaigns',
      );
    }

    await this.prismaService.distribution.delete({
      where: { id },
    });

    await this.logsService.logWarning(
      LogCategory.CAMPAIGN,
      `⚠️ [CAMPAIGN] Distribution supprimée`,
      { distributionId: distribution.id, campaignId: distribution.campaignId },
      sellerId,
    );

    return { message: 'Distribution deleted successfully' };
  }

  /**
   * Configurer plusieurs distributions en une fois
   */
  async createMany(
    campaignId: string,
    sellerId: string,
    distributions: CreateDistributionDto[],
  ): Promise<DistributionResponseDto[]> {
    // Vérifier que la campagne existe et appartient au vendeur
    const campaign = await this.prismaService.campaign.findUnique({
      where: { id: campaignId },
    });

    if (!campaign) {
      throw new NotFoundException(`Campaign with ID ${campaignId} not found`);
    }

    if (campaign.sellerId !== sellerId) {
      throw new ForbiddenException(
        'You can only configure distributions for your own campaigns',
      );
    }

    // Valider toutes les distributions
    distributions.forEach((dto) => this.validateDistributionDto(dto));

    // Créer toutes les distributions
    const results = await Promise.all(
      distributions.map((dto) =>
        this.prismaService.distribution.create({
          data: {
            campaignId,
            type: dto.type,
            dayOfWeek: dto.dayOfWeek ?? null,
            specificDate: dto.specificDate ?? null,
            isActive: dto.isActive ?? true,
          },
        }),
      ),
    );

    await this.logsService.logSuccess(
      LogCategory.CAMPAIGN,
      `✅ [CAMPAIGN] ${results.length} distribution(s) créée(s)`,
      { campaignId, count: results.length },
      sellerId,
    );

    return results.map((r) => this.formatResponse(r));
  }

  /**
   * Valider un DTO de distribution selon son type
   */
  private validateDistributionDto(dto: CreateDistributionDto): void {
    if (dto.type === DistributionType.RECURRING) {
      // Pour RECURRING, dayOfWeek est requis
      if (dto.dayOfWeek === undefined || dto.dayOfWeek === null) {
        throw new BadRequestException(
          'dayOfWeek is required for RECURRING distributions',
        );
      }
      if (dto.dayOfWeek < 0 || dto.dayOfWeek > 6) {
        throw new BadRequestException('dayOfWeek must be between 0 and 6');
      }
      // specificDate ne doit pas être fourni
      if (dto.specificDate) {
        throw new BadRequestException(
          'specificDate should not be provided for RECURRING distributions',
        );
      }
    } else if (dto.type === DistributionType.SPECIFIC_DATE) {
      // Pour SPECIFIC_DATE, specificDate est requis
      if (!dto.specificDate) {
        throw new BadRequestException(
          'specificDate is required for SPECIFIC_DATE distributions',
        );
      }
      // dayOfWeek ne doit pas être fourni
      if (dto.dayOfWeek !== undefined && dto.dayOfWeek !== null) {
        throw new BadRequestException(
          'dayOfWeek should not be provided for SPECIFIC_DATE distributions',
        );
      }
    }
  }

  /**
   * Formater la réponse
   */
  private formatResponse(distribution: any): DistributionResponseDto {
    return {
      id: distribution.id,
      campaignId: distribution.campaignId,
      type: distribution.type,
      dayOfWeek: distribution.dayOfWeek,
      dayName:
        distribution.dayOfWeek !== null
          ? this.dayNames[distribution.dayOfWeek]
          : null,
      specificDate: distribution.specificDate,
      isActive: distribution.isActive,
      createdAt: distribution.createdAt,
      updatedAt: distribution.updatedAt,
    };
  }
}
