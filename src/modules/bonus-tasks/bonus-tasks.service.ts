import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { BonusTaskStatus } from '@prisma/client';
import { CreateBonusTaskDto } from './dto/create-bonus-task.dto';
import { SubmitBonusTaskDto } from './dto/submit-bonus-task.dto';
import { RejectBonusTaskDto } from './dto/reject-bonus-task.dto';

@Injectable()
export class BonusTasksService {
  private readonly logger = new Logger(BonusTasksService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * 1. Créer une bonus task (vendeur seulement)
   */
  async createBonusTask(
    sessionId: string,
    sellerId: string,
    dto: CreateBonusTaskDto,
  ) {
    const session = await this.prisma.session.findUnique({
      where: { id: sessionId },
      include: { campaign: { select: { sellerId: true } } },
    });

    if (!session) {
      throw new NotFoundException('Session not found');
    }

    if (session.campaign.sellerId !== sellerId) {
      throw new ForbiddenException(
        'Only the campaign seller can create bonus tasks',
      );
    }

    const bonusTask = await this.prisma.bonusTask.create({
      data: {
        sessionId,
        requestedBy: sellerId,
        type: dto.type,
        title: dto.title,
        description: dto.description,
        reward: dto.reward,
        status: BonusTaskStatus.REQUESTED,
      },
    });

    this.logger.log(
      `Bonus task created by seller ${sellerId} for session ${sessionId}`,
    );

    return bonusTask;
  }

  /**
   * 2. Accepter une bonus task (testeur seulement)
   */
  async acceptBonusTask(bonusTaskId: string, testerId: string) {
    const bonusTask = await this.prisma.bonusTask.findUnique({
      where: { id: bonusTaskId },
      include: { session: { select: { testerId: true } } },
    });

    if (!bonusTask) {
      throw new NotFoundException('Bonus task not found');
    }

    if (bonusTask.session.testerId !== testerId) {
      throw new ForbiddenException('Only the session tester can accept this task');
    }

    if (bonusTask.status !== BonusTaskStatus.REQUESTED) {
      throw new BadRequestException(
        `Cannot accept task with status ${bonusTask.status}`,
      );
    }

    const updatedTask = await this.prisma.bonusTask.update({
      where: { id: bonusTaskId },
      data: { status: BonusTaskStatus.ACCEPTED },
    });

    this.logger.log(`Bonus task ${bonusTaskId} accepted by tester ${testerId}`);

    return updatedTask;
  }

  /**
   * 3. Refuser une bonus task (testeur seulement)
   */
  async rejectBonusTask(bonusTaskId: string, testerId: string) {
    const bonusTask = await this.prisma.bonusTask.findUnique({
      where: { id: bonusTaskId },
      include: { session: { select: { testerId: true } } },
    });

    if (!bonusTask) {
      throw new NotFoundException('Bonus task not found');
    }

    if (bonusTask.session.testerId !== testerId) {
      throw new ForbiddenException('Only the session tester can reject this task');
    }

    if (bonusTask.status !== BonusTaskStatus.REQUESTED) {
      throw new BadRequestException(
        `Cannot reject task with status ${bonusTask.status}`,
      );
    }

    const updatedTask = await this.prisma.bonusTask.update({
      where: { id: bonusTaskId },
      data: { status: BonusTaskStatus.REJECTED, rejectedAt: new Date() },
    });

    this.logger.log(`Bonus task ${bonusTaskId} rejected by tester ${testerId}`);

    return updatedTask;
  }

  /**
   * 4. Soumettre une bonus task (testeur seulement)
   */
  async submitBonusTask(
    bonusTaskId: string,
    testerId: string,
    dto: SubmitBonusTaskDto,
  ) {
    const bonusTask = await this.prisma.bonusTask.findUnique({
      where: { id: bonusTaskId },
      include: { session: { select: { testerId: true } } },
    });

    if (!bonusTask) {
      throw new NotFoundException('Bonus task not found');
    }

    if (bonusTask.session.testerId !== testerId) {
      throw new ForbiddenException('Only the session tester can submit this task');
    }

    if (bonusTask.status !== BonusTaskStatus.ACCEPTED) {
      throw new BadRequestException(
        `Cannot submit task with status ${bonusTask.status}`,
      );
    }

    const updatedTask = await this.prisma.bonusTask.update({
      where: { id: bonusTaskId },
      data: {
        status: BonusTaskStatus.SUBMITTED,
        submissionUrls: dto.submissionUrls,
        submittedAt: new Date(),
      },
    });

    this.logger.log(`Bonus task ${bonusTaskId} submitted by tester ${testerId}`);

    return updatedTask;
  }

  /**
   * 5. Valider une bonus task et payer (vendeur seulement)
   * TODO: Intégrer avec le système de Wallet (Phase 2)
   */
  async validateBonusTask(bonusTaskId: string, sellerId: string) {
    const bonusTask = await this.prisma.bonusTask.findUnique({
      where: { id: bonusTaskId },
      include: {
        session: {
          include: { campaign: { select: { sellerId: true } }, tester: true },
        },
      },
    });

    if (!bonusTask) {
      throw new NotFoundException('Bonus task not found');
    }

    if (bonusTask.session.campaign.sellerId !== sellerId) {
      throw new ForbiddenException(
        'Only the campaign seller can validate this task',
      );
    }

    if (bonusTask.status !== BonusTaskStatus.SUBMITTED) {
      throw new BadRequestException(
        `Cannot validate task with status ${bonusTask.status}`,
      );
    }

    const updatedTask = await this.prisma.bonusTask.update({
      where: { id: bonusTaskId },
      data: { status: BonusTaskStatus.VALIDATED, validatedAt: new Date() },
    });

    // TODO: Créditer le wallet du testeur
    this.logger.warn(
      `TODO: Credit wallet for tester ${bonusTask.session.testerId} with amount ${bonusTask.reward}`,
    );

    this.logger.log(`Bonus task ${bonusTaskId} validated by seller ${sellerId}`);

    return updatedTask;
  }

  /**
   * 6. Rejeter une soumission (vendeur seulement)
   */
  async rejectSubmission(
    bonusTaskId: string,
    sellerId: string,
    dto: RejectBonusTaskDto,
  ) {
    const bonusTask = await this.prisma.bonusTask.findUnique({
      where: { id: bonusTaskId },
      include: {
        session: { include: { campaign: { select: { sellerId: true } } } },
      },
    });

    if (!bonusTask) {
      throw new NotFoundException('Bonus task not found');
    }

    if (bonusTask.session.campaign.sellerId !== sellerId) {
      throw new ForbiddenException(
        'Only the campaign seller can reject submissions',
      );
    }

    if (bonusTask.status !== BonusTaskStatus.SUBMITTED) {
      throw new BadRequestException(
        `Cannot reject submission with status ${bonusTask.status}`,
      );
    }

    const updatedTask = await this.prisma.bonusTask.update({
      where: { id: bonusTaskId },
      data: {
        status: BonusTaskStatus.ACCEPTED,
        rejectedAt: new Date(),
        rejectionReason: dto.rejectionReason,
      },
    });

    this.logger.log(
      `Bonus task ${bonusTaskId} submission rejected by seller ${sellerId}`,
    );

    return updatedTask;
  }

  /**
   * 7. Annuler une bonus task (vendeur seulement)
   */
  async cancelBonusTask(bonusTaskId: string, sellerId: string) {
    const bonusTask = await this.prisma.bonusTask.findUnique({
      where: { id: bonusTaskId },
      include: {
        session: { include: { campaign: { select: { sellerId: true } } } },
      },
    });

    if (!bonusTask) {
      throw new NotFoundException('Bonus task not found');
    }

    if (bonusTask.session.campaign.sellerId !== sellerId) {
      throw new ForbiddenException(
        'Only the campaign seller can cancel this task',
      );
    }

    if (bonusTask.status === BonusTaskStatus.VALIDATED) {
      throw new BadRequestException('Cannot cancel a validated task');
    }

    const updatedTask = await this.prisma.bonusTask.update({
      where: { id: bonusTaskId },
      data: { status: BonusTaskStatus.CANCELLED },
    });

    this.logger.log(`Bonus task ${bonusTaskId} cancelled by seller ${sellerId}`);

    return updatedTask;
  }

  /**
   * 8. Récupérer toutes les bonus tasks d'une session
   */
  async getBonusTasksBySession(sessionId: string, userId: string) {
    const session = await this.prisma.session.findUnique({
      where: { id: sessionId },
      include: { campaign: { select: { sellerId: true } } },
    });

    if (!session) {
      throw new NotFoundException('Session not found');
    }

    const isAuthorized =
      session.testerId === userId || session.campaign.sellerId === userId;

    if (!isAuthorized) {
      throw new ForbiddenException(
        'You can only view bonus tasks for your own sessions',
      );
    }

    const bonusTasks = await this.prisma.bonusTask.findMany({
      where: { sessionId },
      include: {
        requester: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return bonusTasks;
  }

  /**
   * 9. Récupérer une bonus task par ID
   */
  async getBonusTaskById(bonusTaskId: string, userId: string) {
    const bonusTask = await this.prisma.bonusTask.findUnique({
      where: { id: bonusTaskId },
      include: {
        session: {
          include: { campaign: { select: { sellerId: true } } },
        },
        requester: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
    });

    if (!bonusTask) {
      throw new NotFoundException('Bonus task not found');
    }

    const isAuthorized =
      bonusTask.session.testerId === userId ||
      bonusTask.session.campaign.sellerId === userId;

    if (!isAuthorized) {
      throw new ForbiddenException(
        'You can only view bonus tasks for your own sessions',
      );
    }

    return bonusTask;
  }
}
