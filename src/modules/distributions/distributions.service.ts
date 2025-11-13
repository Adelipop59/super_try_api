import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { LogsService } from '../logs/logs.service';
import { CreateDistributionDto } from './dto/create-distribution.dto';
import { UpdateDistributionDto } from './dto/update-distribution.dto';
import { DistributionResponseDto } from './dto/distribution-response.dto';
import { LogCategory } from '@prisma/client';

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
   * Créer ou mettre à jour une distribution pour un jour
   */
  async upsert(
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

    // Valider dayOfWeek
    if (
      createDistributionDto.dayOfWeek < 0 ||
      createDistributionDto.dayOfWeek > 6
    ) {
      throw new BadRequestException('dayOfWeek must be between 0 and 6');
    }

    // Upsert distribution
    const distribution = await this.prismaService.distribution.upsert({
      where: {
        campaignId_dayOfWeek: {
          campaignId,
          dayOfWeek: createDistributionDto.dayOfWeek,
        },
      },
      create: {
        ...createDistributionDto,
        campaignId,
      },
      update: {
        maxUnits: createDistributionDto.maxUnits,
        isActive:
          createDistributionDto.isActive !== undefined
            ? createDistributionDto.isActive
            : undefined,
      },
    });

    await this.logsService.logSuccess(
      LogCategory.CAMPAIGN,
      `✅ [CAMPAIGN] Distribution configurée pour ${this.dayNames[distribution.dayOfWeek]}: ${distribution.maxUnits} unités`,
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
      orderBy: { dayOfWeek: 'asc' },
    });

    return distributions.map((d) => this.formatResponse(d));
  }

  /**
   * Détails d'une distribution pour un jour spécifique
   */
  async findOne(
    campaignId: string,
    dayOfWeek: number,
  ): Promise<DistributionResponseDto> {
    const distribution = await this.prismaService.distribution.findUnique({
      where: {
        campaignId_dayOfWeek: {
          campaignId,
          dayOfWeek,
        },
      },
    });

    if (!distribution) {
      throw new NotFoundException(
        `Distribution not found for day ${dayOfWeek}`,
      );
    }

    return this.formatResponse(distribution);
  }

  /**
   * Mettre à jour une distribution
   */
  async update(
    campaignId: string,
    dayOfWeek: number,
    sellerId: string,
    updateDistributionDto: UpdateDistributionDto,
    isAdmin: boolean = false,
  ): Promise<DistributionResponseDto> {
    const distribution = await this.prismaService.distribution.findUnique({
      where: {
        campaignId_dayOfWeek: {
          campaignId,
          dayOfWeek,
        },
      },
      include: {
        campaign: true,
      },
    });

    if (!distribution) {
      throw new NotFoundException(
        `Distribution not found for day ${dayOfWeek}`,
      );
    }

    if (!isAdmin && distribution.campaign.sellerId !== sellerId) {
      throw new ForbiddenException(
        'You can only update distributions of your own campaigns',
      );
    }

    const updated = await this.prismaService.distribution.update({
      where: {
        campaignId_dayOfWeek: {
          campaignId,
          dayOfWeek,
        },
      },
      data: {
        ...updateDistributionDto,
      },
    });

    await this.logsService.logSuccess(
      LogCategory.CAMPAIGN,
      `✅ [CAMPAIGN] Distribution modifiée pour ${this.dayNames[dayOfWeek]}`,
      { distributionId: updated.id, campaignId },
      sellerId,
    );

    return this.formatResponse(updated);
  }

  /**
   * Supprimer une distribution (désactiver)
   */
  async remove(
    campaignId: string,
    dayOfWeek: number,
    sellerId: string,
    isAdmin: boolean = false,
  ): Promise<{ message: string }> {
    const distribution = await this.prismaService.distribution.findUnique({
      where: {
        campaignId_dayOfWeek: {
          campaignId,
          dayOfWeek,
        },
      },
      include: {
        campaign: true,
      },
    });

    if (!distribution) {
      throw new NotFoundException(
        `Distribution not found for day ${dayOfWeek}`,
      );
    }

    if (!isAdmin && distribution.campaign.sellerId !== sellerId) {
      throw new ForbiddenException(
        'You can only delete distributions of your own campaigns',
      );
    }

    await this.prismaService.distribution.delete({
      where: {
        campaignId_dayOfWeek: {
          campaignId,
          dayOfWeek,
        },
      },
    });

    await this.logsService.logWarning(
      LogCategory.CAMPAIGN,
      `⚠️ [CAMPAIGN] Distribution supprimée pour ${this.dayNames[dayOfWeek]}`,
      { distributionId: distribution.id, campaignId },
      sellerId,
    );

    return { message: 'Distribution deleted successfully' };
  }

  /**
   * Configurer toute la semaine en une fois
   */
  async configureWeek(
    campaignId: string,
    sellerId: string,
    weekConfig: CreateDistributionDto[],
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

    // Valider qu'il n'y a pas de doublons de jours
    const days = weekConfig.map((c) => c.dayOfWeek);
    const uniqueDays = new Set(days);
    if (days.length !== uniqueDays.size) {
      throw new BadRequestException('Duplicate dayOfWeek values in request');
    }

    // Créer/mettre à jour toutes les distributions
    const results = await Promise.all(
      weekConfig.map((config) =>
        this.prismaService.distribution.upsert({
          where: {
            campaignId_dayOfWeek: {
              campaignId,
              dayOfWeek: config.dayOfWeek,
            },
          },
          create: {
            ...config,
            campaignId,
          },
          update: {
            maxUnits: config.maxUnits,
            isActive: config.isActive !== undefined ? config.isActive : true,
          },
        }),
      ),
    );

    await this.logsService.logSuccess(
      LogCategory.CAMPAIGN,
      `✅ [CAMPAIGN] Planning hebdomadaire configuré (${results.length} jours)`,
      { campaignId, days: results.map((r) => r.dayOfWeek) },
      sellerId,
    );

    return results.map((r) => this.formatResponse(r));
  }

  /**
   * Formater la réponse
   */
  private formatResponse(distribution: any): DistributionResponseDto {
    return {
      id: distribution.id,
      campaignId: distribution.campaignId,
      dayOfWeek: distribution.dayOfWeek,
      dayName: this.dayNames[distribution.dayOfWeek],
      maxUnits: distribution.maxUnits,
      isActive: distribution.isActive,
      createdAt: distribution.createdAt,
      updatedAt: distribution.updatedAt,
    };
  }
}
