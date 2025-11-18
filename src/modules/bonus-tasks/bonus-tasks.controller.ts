import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { BonusTasksService } from './bonus-tasks.service';
import { CreateBonusTaskDto } from './dto/create-bonus-task.dto';
import { SubmitBonusTaskDto } from './dto/submit-bonus-task.dto';
import { RejectBonusTaskDto } from './dto/reject-bonus-task.dto';
import { SupabaseAuthGuard } from '../../common/guards/supabase-auth.guard';
import {
  CurrentUser,
  type AuthenticatedUser,
} from '../../common/decorators/current-user.decorator';

@ApiTags('bonus_tasks')
@Controller()
@UseGuards(SupabaseAuthGuard)
export class BonusTasksController {
  constructor(private readonly bonusTasksService: BonusTasksService) {}

  /**
   * POST /sessions/:sessionId/bonus-tasks
   * Créer une bonus task (vendeur seulement)
   * Peut être appelé même après que la session soit COMPLETED
   */
  @Post('sessions/:sessionId/bonus-tasks')
  async createBonusTask(
    @Param('sessionId') sessionId: string,
    @Body() dto: CreateBonusTaskDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.bonusTasksService.createBonusTask(sessionId, user.id, dto);
  }

  /**
   * GET /sessions/:sessionId/bonus-tasks
   * Lister toutes les bonus tasks d'une session
   */
  @Get('sessions/:sessionId/bonus-tasks')
  async getBonusTasksBySession(
    @Param('sessionId') sessionId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.bonusTasksService.getBonusTasksBySession(sessionId, user.id);
  }

  /**
   * GET /bonus-tasks/:id
   * Récupérer une bonus task par ID
   */
  @Get('bonus-tasks/:id')
  async getBonusTaskById(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.bonusTasksService.getBonusTaskById(id, user.id);
  }

  /**
   * PATCH /bonus-tasks/:id/accept
   * Accepter une bonus task (testeur seulement)
   */
  @Patch('bonus-tasks/:id/accept')
  async acceptBonusTask(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.bonusTasksService.acceptBonusTask(id, user.id);
  }

  /**
   * PATCH /bonus-tasks/:id/reject
   * Refuser une bonus task (testeur seulement)
   */
  @Patch('bonus-tasks/:id/reject')
  async rejectBonusTask(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.bonusTasksService.rejectBonusTask(id, user.id);
  }

  /**
   * PATCH /bonus-tasks/:id/submit
   * Soumettre une bonus task (testeur seulement)
   */
  @Patch('bonus-tasks/:id/submit')
  async submitBonusTask(
    @Param('id') id: string,
    @Body() dto: SubmitBonusTaskDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.bonusTasksService.submitBonusTask(id, user.id, dto);
  }

  /**
   * PATCH /bonus-tasks/:id/validate
   * Valider une bonus task et payer (vendeur seulement)
   */
  @Patch('bonus-tasks/:id/validate')
  async validateBonusTask(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.bonusTasksService.validateBonusTask(id, user.id);
  }

  /**
   * PATCH /bonus-tasks/:id/reject-submission
   * Rejeter la soumission d'une bonus task (vendeur seulement)
   */
  @Patch('bonus-tasks/:id/reject-submission')
  async rejectSubmission(
    @Param('id') id: string,
    @Body() dto: RejectBonusTaskDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.bonusTasksService.rejectSubmission(id, user.id, dto);
  }

  /**
   * DELETE /bonus-tasks/:id
   * Annuler une bonus task (vendeur seulement)
   */
  @Delete('bonus-tasks/:id')
  async cancelBonusTask(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.bonusTasksService.cancelBonusTask(id, user.id);
  }
}
