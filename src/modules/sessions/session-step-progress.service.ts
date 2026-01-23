import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CompleteStepDto } from './dto/complete-step.dto';
import {
  SessionStepProgressResponseDto,
  StepInfoDto,
} from './dto/session-step-progress-response.dto';
import { SessionStatus } from '@prisma/client';

@Injectable()
export class SessionStepProgressService {
  private readonly logger = new Logger(SessionStepProgressService.name);

  constructor(private readonly prismaService: PrismaService) {}

  /**
   * Initialize step progress for a session
   * Called when seller accepts tester application
   */
  async initializeStepProgress(sessionId: string): Promise<void> {
    const session = await this.prismaService.session.findUnique({
      where: { id: sessionId },
      include: {
        campaign: {
          include: {
            procedures: {
              include: {
                steps: {
                  orderBy: { order: 'asc' },
                },
              },
              orderBy: { order: 'asc' },
            },
          },
        },
      },
    });

    if (!session) {
      throw new NotFoundException(`Session ${sessionId} not found`);
    }

    // ✅ NOUVEAU: Skip si mode AMAZON_DIRECT_LINK
    if (session.campaign.marketplaceMode === 'AMAZON_DIRECT_LINK') {
      this.logger.log(
        `Session ${sessionId}: Campaign in AMAZON_DIRECT_LINK mode, skipping step initialization`
      );
      return; // Pas de SessionStepProgress à créer
    }

    // Mode PROCEDURES classique
    const procedures = session.campaign.procedures;

    if (!procedures || procedures.length === 0) {
      this.logger.warn(`No procedures found for campaign ${session.campaignId}`);
      return;
    }

    // Récupérer tous les steps de toutes les procédures
    const allSteps = procedures.flatMap((proc) => proc.steps);

    // Créer les progress tracking pour chaque step
    const progressData = allSteps.map((step) => ({
      sessionId,
      stepId: step.id,
      isCompleted: false,
    }));

    await this.prismaService.sessionStepProgress.createMany({
      data: progressData,
      skipDuplicates: true,
    });
  }

  /**
   * Get all steps progress for a session
   */
  async getSessionProgress(
    sessionId: string,
  ): Promise<SessionStepProgressResponseDto[]> {
    const progress = await this.prismaService.sessionStepProgress.findMany({
      where: { sessionId },
      include: {
        step: {
          include: {
            procedure: true,
          },
        },
      },
      orderBy: [
        { step: { procedure: { order: 'asc' } } },
        { step: { order: 'asc' } },
      ],
    });

    return progress.map((p) => this.formatProgressResponse(p));
  }

  /**
   * Complete a step
   */
  async completeStep(
    sessionId: string,
    stepId: string,
    testerId: string,
    dto: CompleteStepDto,
  ): Promise<SessionStepProgressResponseDto> {
    // Vérifier que la session appartient au testeur
    const session = await this.prismaService.session.findUnique({
      where: { id: sessionId },
    });

    if (!session) {
      throw new NotFoundException(`Session ${sessionId} not found`);
    }

    if (session.testerId !== testerId) {
      throw new ForbiddenException('You can only complete steps in your own sessions');
    }

    if (session.status !== SessionStatus.ACCEPTED && session.status !== SessionStatus.IN_PROGRESS) {
      throw new BadRequestException(
        'You can only complete steps when session is ACCEPTED or IN_PROGRESS',
      );
    }

    // Vérifier que le step existe
    const step = await this.prismaService.step.findUnique({
      where: { id: stepId },
    });

    if (!step) {
      throw new NotFoundException(`Step ${stepId} not found`);
    }


    // Vérifier que tous les steps précédents sont complétés
    await this.checkPreviousStepsCompleted(sessionId, step.order, step.procedureId);

    // Mettre à jour le progress
    const progress = await this.prismaService.sessionStepProgress.update({
      where: {
        sessionId_stepId: {
          sessionId,
          stepId,
        },
      },
      data: {
        isCompleted: true,
        completedAt: new Date(),
        submissionData: {
          response: dto.response,
          comment: dto.comment,
          attachments: dto.attachments,
        },
      },
      include: {
        step: true,
      },
    });

    // Mettre à jour le statut de la session si nécessaire
    if (session.status === SessionStatus.ACCEPTED) {
      await this.prismaService.session.update({
        where: { id: sessionId },
        data: { status: SessionStatus.IN_PROGRESS },
      });
    }

    return this.formatProgressResponse(progress);
  }


  /**
   * Get overall progress percentage
   */
  async getProgressPercentage(sessionId: string): Promise<number> {
    const allProgress = await this.prismaService.sessionStepProgress.findMany({
      where: { sessionId },
    });

    if (allProgress.length === 0) {
      return 0;
    }

    const completedCount = allProgress.filter((p) => p.isCompleted).length;
    return Math.round((completedCount / allProgress.length) * 100);
  }

  /**
   * Check if all previous steps are completed
   */
  private async checkPreviousStepsCompleted(
    sessionId: string,
    currentStepOrder: number,
    procedureId: string,
  ): Promise<void> {
    // Récupérer tous les steps de la même procédure avec un ordre inférieur
    const previousSteps = await this.prismaService.step.findMany({
      where: {
        procedureId,
        order: { lt: currentStepOrder },
      },
    });

    // Vérifier que tous ces steps sont complétés
    for (const step of previousSteps) {
      const progress = await this.prismaService.sessionStepProgress.findUnique(
        {
          where: {
            sessionId_stepId: {
              sessionId,
              stepId: step.id,
            },
          },
        },
      );

      if (!progress || !progress.isCompleted) {
        throw new BadRequestException(
          `You must complete step "${step.title}" before this one`,
        );
      }
    }
  }

  /**
   * Format progress response
   */
  private formatProgressResponse(progress: any): SessionStepProgressResponseDto {
    const stepInfo: StepInfoDto = {
      id: progress.step.id,
      title: progress.step.title,
      type: progress.step.type,
      order: progress.step.order,
      isRequired: progress.step.isRequired,
      description: progress.step.description,
    };

    return {
      id: progress.id,
      sessionId: progress.sessionId,
      stepId: progress.stepId,
      step: stepInfo,
      isCompleted: progress.isCompleted,
      completedAt: progress.completedAt,
      submissionData: progress.submissionData,
      createdAt: progress.createdAt,
      updatedAt: progress.updatedAt,
    };
  }
}
