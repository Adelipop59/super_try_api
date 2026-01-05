import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../database/prisma.service';
import { LogsService } from '../logs/logs.service';
import { CreateStepDto } from './dto/create-step.dto';
import { UpdateStepDto } from './dto/update-step.dto';
import { StepResponseDto } from './dto/step-response.dto';
import { LogCategory, StepType } from '@prisma/client';

@Injectable()
export class StepsService {
  constructor(
    private prismaService: PrismaService,
    private logsService: LogsService,
    private configService: ConfigService,
  ) {}

  /**
   * Créer une étape de test
   */
  async create(
    procedureId: string,
    sellerId: string,
    createStepDto: CreateStepDto,
  ): Promise<StepResponseDto> {
    // Vérifier que la procédure existe et appartient au vendeur
    const procedure = await this.prismaService.procedure.findUnique({
      where: { id: procedureId },
      include: { campaign: true },
    });

    if (!procedure) {
      throw new NotFoundException(`Procedure with ID ${procedureId} not found`);
    }

    if (procedure.campaign.sellerId !== sellerId) {
      throw new ForbiddenException(
        'You can only add steps to procedures of your own campaigns',
      );
    }

    // Valider checklistItems si type CHECKLIST
    if (
      createStepDto.type === StepType.CHECKLIST &&
      (!createStepDto.checklistItems ||
        createStepDto.checklistItems.length === 0)
    ) {
      throw new BadRequestException(
        'checklistItems is required for CHECKLIST type',
      );
    }

    // Gérer isRequired selon la configuration
    const allowOptionalSteps = this.configService.get<boolean>(
      'features.allowOptionalSteps',
      false,
    );
    const isRequired = allowOptionalSteps
      ? createStepDto.isRequired ?? true // Si autorisé, utiliser la valeur du DTO (défaut true)
      : true; // Sinon, forcer à true

    const step = await this.prismaService.step.create({
      data: {
        ...createStepDto,
        procedureId,
        isRequired, // Utiliser la valeur calculée
        checklistItems: createStepDto.checklistItems || undefined,
      },
    });

    await this.logsService.logSuccess(
      LogCategory.PROCEDURE,
      `✅ [PROCEDURE] Étape créée: ${step.title}`,
      { stepId: step.id, procedureId },
      sellerId,
    );

    return this.formatResponse(step);
  }

  /**
   * Liste des étapes d'une procédure
   */
  async findAll(procedureId: string): Promise<StepResponseDto[]> {
    const steps = await this.prismaService.step.findMany({
      where: { procedureId },
      orderBy: { order: 'asc' },
    });

    return steps.map((s) => this.formatResponse(s));
  }

  /**
   * Détails d'une étape
   */
  async findOne(id: string): Promise<StepResponseDto> {
    const step = await this.prismaService.step.findUnique({
      where: { id },
    });

    if (!step) {
      throw new NotFoundException(`Step with ID ${id} not found`);
    }

    return this.formatResponse(step);
  }

  /**
   * Mettre à jour une étape
   */
  async update(
    id: string,
    sellerId: string,
    updateStepDto: UpdateStepDto,
    isAdmin: boolean = false,
  ): Promise<StepResponseDto> {
    const step = await this.prismaService.step.findUnique({
      where: { id },
      include: {
        procedure: {
          include: { campaign: true },
        },
      },
    });

    if (!step) {
      throw new NotFoundException(`Step with ID ${id} not found`);
    }

    if (!isAdmin && step.procedure.campaign.sellerId !== sellerId) {
      throw new ForbiddenException(
        'You can only update steps of your own campaigns',
      );
    }

    // Valider checklistItems si type CHECKLIST
    if (
      updateStepDto.type === StepType.CHECKLIST &&
      updateStepDto.checklistItems &&
      updateStepDto.checklistItems.length === 0
    ) {
      throw new BadRequestException(
        'checklistItems cannot be empty for CHECKLIST type',
      );
    }

    // Gérer isRequired selon la configuration
    const allowOptionalSteps = this.configService.get<boolean>(
      'features.allowOptionalSteps',
      false,
    );
    const dataToUpdate: any = {
      ...updateStepDto,
      checklistItems:
        updateStepDto.checklistItems !== undefined
          ? updateStepDto.checklistItems
          : undefined,
    };

    // Si allowOptionalSteps est false, forcer isRequired à true
    if (!allowOptionalSteps) {
      dataToUpdate.isRequired = true;
    }

    const updated = await this.prismaService.step.update({
      where: { id },
      data: dataToUpdate,
    });

    await this.logsService.logSuccess(
      LogCategory.PROCEDURE,
      `✅ [PROCEDURE] Étape modifiée: ${updated.title}`,
      { stepId: id },
      sellerId,
    );

    return this.formatResponse(updated);
  }

  /**
   * Supprimer une étape
   */
  async remove(
    id: string,
    sellerId: string,
    isAdmin: boolean = false,
  ): Promise<{ message: string }> {
    const step = await this.prismaService.step.findUnique({
      where: { id },
      include: {
        procedure: {
          include: { campaign: true },
        },
      },
    });

    if (!step) {
      throw new NotFoundException(`Step with ID ${id} not found`);
    }

    if (!isAdmin && step.procedure.campaign.sellerId !== sellerId) {
      throw new ForbiddenException(
        'You can only delete steps of your own campaigns',
      );
    }

    await this.prismaService.step.delete({ where: { id } });

    await this.logsService.logWarning(
      LogCategory.PROCEDURE,
      `⚠️ [PROCEDURE] Étape supprimée: ${step.title}`,
      { stepId: id },
      sellerId,
    );

    return { message: 'Step deleted successfully' };
  }

  /**
   * Réordonner les étapes
   */
  async reorder(
    procedureId: string,
    sellerId: string,
    stepIds: string[],
    isAdmin: boolean = false,
  ): Promise<StepResponseDto[]> {
    const procedure = await this.prismaService.procedure.findUnique({
      where: { id: procedureId },
      include: { campaign: true },
    });

    if (!procedure) {
      throw new NotFoundException(`Procedure with ID ${procedureId} not found`);
    }

    if (!isAdmin && procedure.campaign.sellerId !== sellerId) {
      throw new ForbiddenException(
        'You can only reorder steps of your own campaigns',
      );
    }

    // Mettre à jour l'ordre
    const updates = stepIds.map((id, index) =>
      this.prismaService.step.update({
        where: { id },
        data: { order: index + 1 },
      }),
    );

    await Promise.all(updates);

    await this.logsService.logSuccess(
      LogCategory.PROCEDURE,
      `✅ [PROCEDURE] Étapes réordonnées pour procédure ${procedureId}`,
      { procedureId, newOrder: stepIds },
      sellerId,
    );

    return this.findAll(procedureId);
  }

  /**
   * Formater la réponse
   */
  private formatResponse(step: any): StepResponseDto {
    return {
      id: step.id,
      procedureId: step.procedureId,
      title: step.title,
      description: step.description,
      type: step.type,
      order: step.order,
      isRequired: step.isRequired,
      checklistItems: step.checklistItems
        ? (step.checklistItems as string[])
        : null,
      createdAt: step.createdAt,
      updatedAt: step.updatedAt,
    };
  }
}
