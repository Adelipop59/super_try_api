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
import {
  ValidateDistributionsRequestDto,
  ValidateDistributionsResponseDto,
  DistributionValidationResult,
  DistributionValidationError,
} from './dto/validate-distributions.dto';
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

    // Validation des règles de sécurité (dates et maxUnits)
    const existingMaxUnits = await this.getExistingMaxUnitsSum(campaignId);
    await this.validateSingleDistributionAgainstCampaign(
      campaign,
      createDistributionDto,
      existingMaxUnits,
    );

    // Créer la distribution
    const distribution = await this.prismaService.distribution.create({
      data: {
        campaignId,
        type: createDistributionDto.type,
        dayOfWeek: createDistributionDto.dayOfWeek ?? 0,
        specificDate: createDistributionDto.specificDate
          ? new Date(createDistributionDto.specificDate)
          : null,
        maxUnits: createDistributionDto.maxUnits,
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
      this.validateDistributionDto(
        updateDistributionDto as CreateDistributionDto,
      );
    }

    // Construire le DTO complet pour validation
    const dtoForValidation: CreateDistributionDto = {
      type: updateDistributionDto.type ?? distribution.type,
      dayOfWeek: updateDistributionDto.dayOfWeek ?? distribution.dayOfWeek ?? undefined,
      specificDate: updateDistributionDto.specificDate
        ? new Date(updateDistributionDto.specificDate)
        : distribution.specificDate ?? undefined,
      maxUnits: updateDistributionDto.maxUnits ?? distribution.maxUnits,
      isActive: updateDistributionDto.isActive ?? distribution.isActive,
    };

    // Validation des règles de sécurité (dates et maxUnits)
    // Exclure cette distribution du calcul des maxUnits existants
    const existingMaxUnits = await this.getExistingMaxUnitsSum(
      distribution.campaignId,
      [id],
    );
    await this.validateSingleDistributionAgainstCampaign(
      distribution.campaign,
      dtoForValidation,
      existingMaxUnits,
      id,
    );

    const updated = await this.prismaService.distribution.update({
      where: { id },
      data: {
        type: updateDistributionDto.type,
        dayOfWeek: updateDistributionDto.dayOfWeek ?? undefined,
        specificDate: updateDistributionDto.specificDate
          ? new Date(updateDistributionDto.specificDate)
          : undefined,
        maxUnits: updateDistributionDto.maxUnits,
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

    // Valider toutes les distributions selon leur type
    distributions.forEach((dto) => this.validateDistributionDto(dto));

    // Validation des règles de sécurité pour toutes les distributions
    const existingMaxUnits = await this.getExistingMaxUnitsSum(campaignId);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let accumulatedMaxUnits = existingMaxUnits;

    for (let i = 0; i < distributions.length; i++) {
      const dto = distributions[i];

      // Validation pour SPECIFIC_DATE
      if (dto.type === DistributionType.SPECIFIC_DATE && dto.specificDate) {
        const specificDate = new Date(dto.specificDate);
        specificDate.setHours(0, 0, 0, 0);

        // Règle 1: Date pas dans le passé
        if (specificDate < today) {
          throw new BadRequestException(
            `Distribution ${i + 1}: La date ${specificDate.toLocaleDateString('fr-FR')} est dans le passé. La date doit être aujourd'hui ou dans le futur.`,
          );
        }

        // Règle 2: Date dans la période de la campagne
        const campaignStartDate = new Date(campaign.startDate);
        campaignStartDate.setHours(0, 0, 0, 0);

        if (specificDate < campaignStartDate) {
          throw new BadRequestException(
            `Distribution ${i + 1}: La date ${specificDate.toLocaleDateString('fr-FR')} est avant le début de la campagne (${campaignStartDate.toLocaleDateString('fr-FR')}).`,
          );
        }

        if (campaign.endDate) {
          const campaignEndDate = new Date(campaign.endDate);
          campaignEndDate.setHours(0, 0, 0, 0);

          if (specificDate > campaignEndDate) {
            throw new BadRequestException(
              `Distribution ${i + 1}: La date ${specificDate.toLocaleDateString('fr-FR')} est après la fin de la campagne (${campaignEndDate.toLocaleDateString('fr-FR')}).`,
            );
          }
        }
      }

      // Accumuler les maxUnits
      accumulatedMaxUnits += dto.maxUnits;
    }

    // Règle 3: Vérifier la somme totale des maxUnits
    if (accumulatedMaxUnits > campaign.totalSlots) {
      throw new BadRequestException(
        `La somme des maxUnits (${accumulatedMaxUnits}) dépasse le nombre total de slots de la campagne (${campaign.totalSlots}). Existants: ${existingMaxUnits}, Nouveaux: ${accumulatedMaxUnits - existingMaxUnits}.`,
      );
    }

    // Créer toutes les distributions
    const results = await Promise.all(
      distributions.map((dto) =>
        this.prismaService.distribution.create({
          data: {
            campaignId,
            type: dto.type,
            dayOfWeek: dto.dayOfWeek ?? 0,
            specificDate: dto.specificDate
              ? new Date(dto.specificDate)
              : null,
            maxUnits: dto.maxUnits,
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
      maxUnits: distribution.maxUnits,
      isActive: distribution.isActive,
      createdAt: distribution.createdAt,
      updatedAt: distribution.updatedAt,
    };
  }

  /**
   * Valider les distributions pour une campagne
   * Vérifie les règles critiques:
   * - Date dans la période de la campagne (startDate <= specificDate <= endDate)
   * - Date pas dans le passé (specificDate >= aujourd'hui)
   * - Somme des maxUnits ne dépasse pas totalSlots
   */
  async validateDistributions(
    request: ValidateDistributionsRequestDto,
  ): Promise<ValidateDistributionsResponseDto> {
    const { campaignId, distributions, includeExistingDistributions = true } = request;

    // Récupérer la campagne
    const campaign = await this.prismaService.campaign.findUnique({
      where: { id: campaignId },
      include: {
        distributions: includeExistingDistributions,
      },
    });

    if (!campaign) {
      throw new NotFoundException(`Campaign with ID ${campaignId} not found`);
    }

    const results: DistributionValidationResult[] = [];
    const globalErrors: DistributionValidationError[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let totalMaxUnits = 0;
    let existingDistributionsMaxUnits = 0;

    // Calculer les maxUnits des distributions existantes
    if (includeExistingDistributions && campaign.distributions) {
      existingDistributionsMaxUnits = campaign.distributions.reduce(
        (sum, dist) => sum + dist.maxUnits,
        0,
      );
    }

    // Valider chaque distribution
    for (let i = 0; i < distributions.length; i++) {
      const dto = distributions[i];
      const errors: DistributionValidationError[] = [];

      // Validation de base selon le type
      try {
        this.validateDistributionDto(dto);
      } catch (error) {
        if (error instanceof BadRequestException) {
          errors.push({
            index: i,
            field: 'type',
            code: 'INVALID_TYPE',
            message: error.message,
            severity: 'CRITICAL',
          });
        }
      }

      // Validation spécifique pour SPECIFIC_DATE
      if (dto.type === DistributionType.SPECIFIC_DATE && dto.specificDate) {
        const specificDate = new Date(dto.specificDate);
        specificDate.setHours(0, 0, 0, 0);

        // Règle 1: Date pas dans le passé
        if (specificDate < today) {
          errors.push({
            index: i,
            field: 'specificDate',
            code: 'DATE_IN_PAST',
            message: `La date ${specificDate.toLocaleDateString('fr-FR')} est dans le passé. La date doit être aujourd'hui ou dans le futur.`,
            severity: 'CRITICAL',
          });
        }

        // Règle 2: Date dans la période de la campagne
        const campaignStartDate = new Date(campaign.startDate);
        campaignStartDate.setHours(0, 0, 0, 0);

        if (specificDate < campaignStartDate) {
          errors.push({
            index: i,
            field: 'specificDate',
            code: 'DATE_OUT_OF_CAMPAIGN_PERIOD',
            message: `La date ${specificDate.toLocaleDateString('fr-FR')} est avant le début de la campagne (${campaignStartDate.toLocaleDateString('fr-FR')}).`,
            severity: 'CRITICAL',
          });
        }

        if (campaign.endDate) {
          const campaignEndDate = new Date(campaign.endDate);
          campaignEndDate.setHours(0, 0, 0, 0);

          if (specificDate > campaignEndDate) {
            errors.push({
              index: i,
              field: 'specificDate',
              code: 'DATE_OUT_OF_CAMPAIGN_PERIOD',
              message: `La date ${specificDate.toLocaleDateString('fr-FR')} est après la fin de la campagne (${campaignEndDate.toLocaleDateString('fr-FR')}).`,
              severity: 'CRITICAL',
            });
          }
        }
      }

      // Accumuler les maxUnits si la distribution n'a pas d'erreurs critiques
      if (errors.length === 0) {
        totalMaxUnits += dto.maxUnits;
      }

      results.push({
        index: i,
        isValid: errors.length === 0,
        errors,
      });
    }

    // Règle 3: Vérifier que la somme des maxUnits ne dépasse pas totalSlots
    const combinedMaxUnits = totalMaxUnits + existingDistributionsMaxUnits;
    if (combinedMaxUnits > campaign.totalSlots) {
      globalErrors.push({
        index: -1,
        field: 'maxUnits',
        code: 'MAX_UNITS_EXCEEDED',
        message: `La somme des maxUnits (${combinedMaxUnits}) dépasse le nombre total de slots de la campagne (${campaign.totalSlots}). Nouvelles distributions: ${totalMaxUnits}, Existantes: ${existingDistributionsMaxUnits}.`,
        severity: 'CRITICAL',
      });
    }

    const hasErrors = results.some((r) => !r.isValid) || globalErrors.length > 0;

    return {
      isValid: !hasErrors,
      results,
      globalErrors,
      totalMaxUnits,
      campaignTotalSlots: campaign.totalSlots,
      existingDistributionsMaxUnits,
    };
  }

  /**
   * Valider une seule distribution contre les règles de la campagne
   * Utilisé en interne lors de create/update
   */
  private async validateSingleDistributionAgainstCampaign(
    campaign: {
      startDate: Date;
      endDate: Date | null;
      totalSlots: number;
    },
    dto: CreateDistributionDto,
    existingMaxUnitsSum: number = 0,
    excludeDistributionId?: string,
  ): Promise<void> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Validation pour SPECIFIC_DATE
    if (dto.type === DistributionType.SPECIFIC_DATE && dto.specificDate) {
      const specificDate = new Date(dto.specificDate);
      specificDate.setHours(0, 0, 0, 0);

      // Règle 1: Date pas dans le passé
      if (specificDate < today) {
        throw new BadRequestException(
          `La date ${specificDate.toLocaleDateString('fr-FR')} est dans le passé. La date doit être aujourd'hui ou dans le futur.`,
        );
      }

      // Règle 2: Date dans la période de la campagne
      const campaignStartDate = new Date(campaign.startDate);
      campaignStartDate.setHours(0, 0, 0, 0);

      if (specificDate < campaignStartDate) {
        throw new BadRequestException(
          `La date ${specificDate.toLocaleDateString('fr-FR')} est avant le début de la campagne (${campaignStartDate.toLocaleDateString('fr-FR')}).`,
        );
      }

      if (campaign.endDate) {
        const campaignEndDate = new Date(campaign.endDate);
        campaignEndDate.setHours(0, 0, 0, 0);

        if (specificDate > campaignEndDate) {
          throw new BadRequestException(
            `La date ${specificDate.toLocaleDateString('fr-FR')} est après la fin de la campagne (${campaignEndDate.toLocaleDateString('fr-FR')}).`,
          );
        }
      }
    }

    // Règle 3: Vérifier la somme des maxUnits
    const newTotalMaxUnits = existingMaxUnitsSum + dto.maxUnits;
    if (newTotalMaxUnits > campaign.totalSlots) {
      throw new BadRequestException(
        `La somme des maxUnits (${newTotalMaxUnits}) dépasse le nombre total de slots de la campagne (${campaign.totalSlots}).`,
      );
    }
  }

  /**
   * Calculer la somme des maxUnits existants pour une campagne
   */
  private async getExistingMaxUnitsSum(
    campaignId: string,
    excludeDistributionIds: string[] = [],
  ): Promise<number> {
    const distributions = await this.prismaService.distribution.findMany({
      where: {
        campaignId,
        id: {
          notIn: excludeDistributionIds,
        },
      },
      select: {
        maxUnits: true,
      },
    });

    return distributions.reduce((sum, dist) => sum + dist.maxUnits, 0);
  }
}
