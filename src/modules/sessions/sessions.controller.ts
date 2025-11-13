import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Query,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { SessionsService } from './sessions.service';
import { SupabaseAuthGuard } from '../../common/guards/supabase-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { ApplySessionDto } from './dto/apply-session.dto';
import { RejectSessionDto } from './dto/reject-session.dto';
import { SubmitPurchaseDto } from './dto/submit-purchase.dto';
import { SubmitTestDto } from './dto/submit-test.dto';
import { ValidateTestDto } from './dto/validate-test.dto';
import { CancelSessionDto } from './dto/cancel-session.dto';
import { DisputeSessionDto } from './dto/dispute-session.dto';
import { SessionFilterDto } from './dto/session-filter.dto';
import { SessionResponseDto } from './dto/session-response.dto';
import { AcceptSessionResponseDto } from './dto/accept-session.dto';

@ApiTags('sessions')
@Controller('sessions')
@UseGuards(SupabaseAuthGuard, RolesGuard)
export class SessionsController {
  constructor(
    private readonly sessionsService: SessionsService,
  ) {}

  /**
   * 1. Postuler à une campagne (USER uniquement)
   */
  @Post('apply')
  @Roles('USER')
  @ApiBearerAuth('supabase-auth')
  @ApiOperation({
    summary: 'Postuler à une campagne de test (USER)',
    description:
      'Permet à un testeur de postuler pour participer à une campagne de test. La candidature sera en attente d\'acceptation par le vendeur.',
  })
  @ApiResponse({
    status: 201,
    description: 'Candidature envoyée avec succès',
    type: SessionResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Campagne non active ou déjà postulé' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Rôle USER requis' })
  @ApiResponse({ status: 404, description: 'Campagne non trouvée' })
  async applyToCampaign(
    @CurrentUser() user: AuthenticatedUser,
    @Body() applySessionDto: ApplySessionDto,
  ): Promise<SessionResponseDto> {
    return this.sessionsService.applyToCampaign(
      user.id,
      applySessionDto,
    );
  }

  /**
   * 2. Accepter une session (PRO uniquement - propriétaire de la campagne)
   */
  @Patch(':id/accept')
  @Roles('PRO', 'ADMIN')
  @ApiBearerAuth('supabase-auth')
  @ApiOperation({
    summary: 'Accepter une session (PRO/ADMIN)',
    description:
      'Permet au vendeur d\'accepter la candidature d\'un testeur. Le testeur pourra alors acheter le produit et commencer le test.',
  })
  @ApiParam({ name: 'id', description: 'ID de la session' })
  @ApiResponse({
    status: 200,
    description: 'Session acceptée avec succès',
    type: SessionResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Statut invalide ou pas de slots disponibles' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Accès refusé - pas propriétaire de la campagne' })
  @ApiResponse({ status: 404, description: 'Session non trouvée' })
  async acceptSession(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<SessionResponseDto> {
    const isAdmin = user.role === 'ADMIN';
    return this.sessionsService.acceptSession(id, user.id, isAdmin);
  }

  /**
   * 3. Refuser une session (PRO uniquement - propriétaire de la campagne)
   */
  @Patch(':id/reject')
  @Roles('PRO', 'ADMIN')
  @ApiBearerAuth('supabase-auth')
  @ApiOperation({
    summary: 'Refuser une session (PRO/ADMIN)',
    description:
      'Permet au vendeur de refuser la candidature d\'un testeur avec une raison.',
  })
  @ApiParam({ name: 'id', description: 'ID de la session' })
  @ApiResponse({
    status: 200,
    description: 'Session refusée avec succès',
    type: SessionResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Statut invalide' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Accès refusé' })
  @ApiResponse({ status: 404, description: 'Session non trouvée' })
  async rejectSession(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() rejectSessionDto: RejectSessionDto,
  ): Promise<SessionResponseDto> {
    const isAdmin = user.role === 'ADMIN';
    return this.sessionsService.rejectSession(
      id,
      user.id,
      rejectSessionDto,
      isAdmin,
    );
  }

  /**
   * 4. Soumettre la preuve d'achat (USER testeur uniquement)
   */
  @Patch(':id/submit-purchase')
  @Roles('USER')
  @ApiBearerAuth('supabase-auth')
  @ApiOperation({
    summary: 'Soumettre la preuve d\'achat (USER)',
    description:
      'Permet au testeur de soumettre la preuve d\'achat du produit (reçu, confirmation) après l\'avoir acheté.',
  })
  @ApiParam({ name: 'id', description: 'ID de la session' })
  @ApiResponse({
    status: 200,
    description: 'Preuve d\'achat soumise avec succès',
    type: SessionResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Statut invalide' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Accès refusé' })
  @ApiResponse({ status: 404, description: 'Session non trouvée' })
  async submitPurchaseProof(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() submitPurchaseDto: SubmitPurchaseDto,
  ): Promise<SessionResponseDto> {
    return this.sessionsService.submitPurchaseProof(
      id,
      user.id,
      submitPurchaseDto,
    );
  }

  /**
   * 5. Soumettre le test complété (USER testeur uniquement)
   */
  @Patch(':id/submit-test')
  @Roles('USER')
  @ApiBearerAuth('supabase-auth')
  @ApiOperation({
    summary: 'Soumettre le test complété (USER)',
    description:
      'Permet au testeur de soumettre le test complété avec toutes les réponses, photos, vidéos selon les procédures définies.',
  })
  @ApiParam({ name: 'id', description: 'ID de la session' })
  @ApiResponse({
    status: 200,
    description: 'Test soumis avec succès',
    type: SessionResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Statut invalide' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Accès refusé' })
  @ApiResponse({ status: 404, description: 'Session non trouvée' })
  async submitTest(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() submitTestDto: SubmitTestDto,
  ): Promise<SessionResponseDto> {
    return this.sessionsService.submitTest(id, user.id, submitTestDto);
  }

  /**
   * 6. Valider le test et noter le testeur (PRO uniquement - propriétaire de la campagne)
   */
  @Patch(':id/validate')
  @Roles('PRO', 'ADMIN')
  @ApiBearerAuth('supabase-auth')
  @ApiOperation({
    summary: 'Valider le test et noter le testeur (PRO/ADMIN)',
    description:
      'Permet au vendeur de valider le test soumis, noter le testeur et déclencher le paiement de la récompense.',
  })
  @ApiParam({ name: 'id', description: 'ID de la session' })
  @ApiResponse({
    status: 200,
    description: 'Test validé et testeur noté',
    type: SessionResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Statut invalide' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Accès refusé' })
  @ApiResponse({ status: 404, description: 'Session non trouvée' })
  async validateTest(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() validateTestDto: ValidateTestDto,
  ): Promise<SessionResponseDto> {
    const isAdmin = user.role === 'ADMIN';
    return this.sessionsService.validateTest(
      id,
      user.id,
      validateTestDto,
      isAdmin,
    );
  }

  /**
   * 7. Annuler une session (USER testeur uniquement)
   */
  @Patch(':id/cancel')
  @Roles('USER')
  @ApiBearerAuth('supabase-auth')
  @ApiOperation({
    summary: 'Annuler une session (USER)',
    description:
      'Permet au testeur d\'annuler sa participation à une session de test.',
  })
  @ApiParam({ name: 'id', description: 'ID de la session' })
  @ApiResponse({
    status: 200,
    description: 'Session annulée avec succès',
    type: SessionResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Statut invalide' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Accès refusé' })
  @ApiResponse({ status: 404, description: 'Session non trouvée' })
  async cancelSession(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() cancelSessionDto: CancelSessionDto,
  ): Promise<SessionResponseDto> {
    return this.sessionsService.cancelSession(
      id,
      user.id,
      cancelSessionDto,
    );
  }

  /**
   * 8. Créer un litige (testeur ou vendeur)
   */
  @Patch(':id/dispute')
  @Roles('USER', 'PRO', 'ADMIN')
  @ApiBearerAuth('supabase-auth')
  @ApiOperation({
    summary: 'Créer un litige (USER/PRO/ADMIN)',
    description:
      'Permet au testeur ou au vendeur de créer un litige pour une session. Le litige sera traité par un administrateur.',
  })
  @ApiParam({ name: 'id', description: 'ID de la session' })
  @ApiResponse({
    status: 200,
    description: 'Litige créé avec succès',
    type: SessionResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Accès refusé' })
  @ApiResponse({ status: 404, description: 'Session non trouvée' })
  async createDispute(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() disputeSessionDto: DisputeSessionDto,
  ): Promise<SessionResponseDto> {
    return this.sessionsService.createDispute(
      id,
      user.id,
      disputeSessionDto,
      user.role,
    );
  }

  /**
   * 9. Lister les sessions avec filtres
   */
  @Get()
  @ApiBearerAuth('supabase-auth')
  @ApiOperation({
    summary: 'Lister les sessions de test',
    description:
      'Liste les sessions de test selon le rôle: USER voit ses sessions, PRO voit les sessions de ses campagnes, ADMIN voit tout. Filtres disponibles.',
  })
  @ApiResponse({
    status: 200,
    description: 'Liste des sessions',
    type: [SessionResponseDto],
  })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  async findAll(
    @CurrentUser() user: AuthenticatedUser,
    @Query() filters: SessionFilterDto,
  ): Promise<SessionResponseDto[]> {
    return this.sessionsService.findAll(user.id, user.role, filters);
  }

  /**
   * 10. Détails d'une session
   */
  @Get(':id')
  @ApiBearerAuth('supabase-auth')
  @ApiOperation({
    summary: 'Détails d\'une session',
    description:
      'Récupère les détails complets d\'une session (testeur, vendeur propriétaire ou admin uniquement).',
  })
  @ApiParam({ name: 'id', description: 'ID de la session' })
  @ApiResponse({
    status: 200,
    description: 'Détails de la session',
    type: SessionResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Accès refusé' })
  @ApiResponse({ status: 404, description: 'Session non trouvée' })
  async findOne(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<SessionResponseDto> {
    return this.sessionsService.findOne(id, user.id, user.role);
  }

  /**
   * 11. Supprimer une session (ADMIN uniquement)
   */
  @Delete(':id')
  @Roles('ADMIN')
  @ApiBearerAuth('supabase-auth')
  @ApiOperation({
    summary: 'Supprimer une session (ADMIN)',
    description: 'Supprime une session (ADMIN uniquement).',
  })
  @ApiParam({ name: 'id', description: 'ID de la session' })
  @ApiResponse({
    status: 200,
    description: 'Session supprimée avec succès',
  })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Rôle ADMIN requis' })
  @ApiResponse({ status: 404, description: 'Session non trouvée' })
  async remove(@Param('id') id: string): Promise<{ message: string }> {
    return this.sessionsService.remove(id);
  }
}
