import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { LogsService } from '../logs/logs.service';
import { CreateProcedureDto } from './dto/create-procedure.dto';
import { UpdateProcedureDto } from './dto/update-procedure.dto';
import { ProcedureResponseDto } from './dto/procedure-response.dto';
import { LogCategory, StepType } from '@prisma/client';

@Injectable()
export class ProceduresService {
  constructor(
    private prismaService: PrismaService,
    private logsService: LogsService,
  ) {}

  /**
   * Créer une procédure de test
   */
  async create(
    campaignId: string,
    sellerId: string,
    createProcedureDto: CreateProcedureDto,
  ): Promise<ProcedureResponseDto> {
    // Vérifier que la campagne existe et appartient au vendeur
    const campaign = await this.prismaService.campaign.findUnique({
      where: { id: campaignId },
    });

    if (!campaign) {
      throw new NotFoundException(`Campaign with ID ${campaignId} not found`);
    }

    if (campaign.sellerId !== sellerId) {
      throw new ForbiddenException(
        'You can only add procedures to your own campaigns',
      );
    }

    const procedure = await this.prismaService.procedure.create({
      data: {
        ...createProcedureDto,
        campaignId,
      },
    });

    await this.logsService.logSuccess(
      LogCategory.PROCEDURE,
      `✅ [PROCEDURE] Procédure créée: ${procedure.title}`,
      { procedureId: procedure.id, campaignId },
      sellerId,
    );

    return this.formatResponse(procedure);
  }

  /**
   * Liste des procédures d'une campagne
   */
  async findAll(campaignId: string): Promise<ProcedureResponseDto[]> {
    const procedures = await this.prismaService.procedure.findMany({
      where: { campaignId },
      orderBy: { order: 'asc' },
    });

    return procedures.map((p) => this.formatResponse(p));
  }

  /**
   * Détails d'une procédure
   */
  async findOne(id: string): Promise<ProcedureResponseDto> {
    const procedure = await this.prismaService.procedure.findUnique({
      where: { id },
    });

    if (!procedure) {
      throw new NotFoundException(`Procedure with ID ${id} not found`);
    }

    return this.formatResponse(procedure);
  }

  /**
   * Mettre à jour une procédure
   */
  async update(
    id: string,
    sellerId: string,
    updateProcedureDto: UpdateProcedureDto,
    isAdmin: boolean = false,
  ): Promise<ProcedureResponseDto> {
    const procedure = await this.prismaService.procedure.findUnique({
      where: { id },
      include: { campaign: true },
    });

    if (!procedure) {
      throw new NotFoundException(`Procedure with ID ${id} not found`);
    }

    if (!isAdmin && procedure.campaign.sellerId !== sellerId) {
      throw new ForbiddenException(
        'You can only update procedures of your own campaigns',
      );
    }

    const updated = await this.prismaService.procedure.update({
      where: { id },
      data: updateProcedureDto,
    });

    await this.logsService.logSuccess(
      LogCategory.PROCEDURE,
      `✅ [PROCEDURE] Procédure modifiée: ${updated.title}`,
      { procedureId: id },
      sellerId,
    );

    return this.formatResponse(updated);
  }

  /**
   * Supprimer une procédure
   */
  async remove(
    id: string,
    sellerId: string,
    isAdmin: boolean = false,
  ): Promise<{ message: string }> {
    const procedure = await this.prismaService.procedure.findUnique({
      where: { id },
      include: { campaign: true },
    });

    if (!procedure) {
      throw new NotFoundException(`Procedure with ID ${id} not found`);
    }

    if (!isAdmin && procedure.campaign.sellerId !== sellerId) {
      throw new ForbiddenException(
        'You can only delete procedures of your own campaigns',
      );
    }

    await this.prismaService.procedure.delete({ where: { id } });

    await this.logsService.logWarning(
      LogCategory.PROCEDURE,
      `⚠️ [PROCEDURE] Procédure supprimée: ${procedure.title}`,
      { procedureId: id },
      sellerId,
    );

    return { message: 'Procedure deleted successfully' };
  }

  /**
   * Réordonner les procédures
   */
  async reorder(
    campaignId: string,
    sellerId: string,
    procedureIds: string[],
    isAdmin: boolean = false,
  ): Promise<ProcedureResponseDto[]> {
    const campaign = await this.prismaService.campaign.findUnique({
      where: { id: campaignId },
    });

    if (!campaign) {
      throw new NotFoundException(`Campaign with ID ${campaignId} not found`);
    }

    if (!isAdmin && campaign.sellerId !== sellerId) {
      throw new ForbiddenException(
        'You can only reorder procedures of your own campaigns',
      );
    }

    // Mettre à jour l'ordre
    const updates = procedureIds.map((id, index) =>
      this.prismaService.procedure.update({
        where: { id },
        data: { order: index + 1 },
      }),
    );

    await Promise.all(updates);

    await this.logsService.logSuccess(
      LogCategory.PROCEDURE,
      `✅ [PROCEDURE] Procédures réordonnées pour campagne ${campaignId}`,
      { campaignId, newOrder: procedureIds },
      sellerId,
    );

    return this.findAll(campaignId);
  }

  /**
   * Formater la réponse
   */
  private formatResponse(procedure: any): ProcedureResponseDto {
    return {
      id: procedure.id,
      campaignId: procedure.campaignId,
      title: procedure.title,
      description: procedure.description,
      order: procedure.order,
      isRequired: procedure.isRequired,
      createdAt: procedure.createdAt,
      updatedAt: procedure.updatedAt,
    };
  }
}
