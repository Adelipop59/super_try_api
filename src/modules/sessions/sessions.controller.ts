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
import { RequireKyc } from '../../common/decorators/require-kyc.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { ApplySessionDto } from './dto/apply-session.dto';
import { RejectSessionDto } from './dto/reject-session.dto';
import { SubmitPurchaseDto } from './dto/submit-purchase.dto';
import { ValidateProductPriceDto } from './dto/validate-product-price.dto';
import { SubmitTestDto } from './dto/submit-test.dto';
import { ValidateTestDto } from './dto/validate-test.dto';
import { RateTesterDto } from './dto/rate-tester.dto';
import { CancelSessionDto } from './dto/cancel-session.dto';
import { DisputeSessionDto } from './dto/dispute-session.dto';
import { SessionFilterDto } from './dto/session-filter.dto';
import { SessionResponseDto } from './dto/session-response.dto';
import { ValidatePurchaseDto } from './dto/validate-purchase.dto';
import { RejectPurchaseDto } from './dto/reject-purchase.dto';
import { ValidateAndRequestUGCDto } from './dto/ugc-request.dto';
import { SubmitUGCDto } from './dto/submit-ugc.dto';
import { DeclineUGCDto } from './dto/decline-ugc.dto';
import { ValidateUGCDto } from './dto/validate-ugc.dto';
import { RejectUGCDto } from './dto/reject-ugc.dto';
import { CloseSessionDto } from './dto/close-session.dto';
import { CompleteStepDto } from './dto/complete-step.dto';

@ApiTags('sessions')
@Controller('sessions')
@UseGuards(SupabaseAuthGuard, RolesGuard)
export class SessionsController {
  constructor(private readonly sessionsService: SessionsService) {}

  /**
   * 1. Postuler à une campagne (USER uniquement)
   */
  @Post('apply')
  @Roles('USER')
  @RequireKyc()
  @ApiBearerAuth('supabase-auth')
  @ApiOperation({
    summary: 'Postuler à une campagne de test (USER)',
    description:
      "Permet à un testeur de postuler pour participer à une campagne de test. La candidature sera en attente d'acceptation par le vendeur. Nécessite une vérification KYC complétée.",
  })
  @ApiResponse({
    status: 201,
    description: 'Candidature envoyée avec succès',
    type: SessionResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Campagne non active ou déjà postulé',
  })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'KYC non vérifié ou rôle USER requis' })
  @ApiResponse({ status: 404, description: 'Campagne non trouvée' })
  async applyToCampaign(
    @CurrentUser() user: AuthenticatedUser,
    @Body() applySessionDto: ApplySessionDto,
  ): Promise<SessionResponseDto> {
    return this.sessionsService.applyToCampaign(user.id, applySessionDto);
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
      "Permet au vendeur d'accepter la candidature d'un testeur. Le testeur pourra alors acheter le produit et commencer le test.",
  })
  @ApiParam({ name: 'id', description: 'ID de la session' })
  @ApiResponse({
    status: 200,
    description: 'Session acceptée avec succès',
    type: SessionResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Statut invalide ou pas de slots disponibles',
  })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({
    status: 403,
    description: 'Accès refusé - pas propriétaire de la campagne',
  })
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
      "Permet au vendeur de refuser la candidature d'un testeur avec une raison.",
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
   * 3.5. Valider le prix du produit trouvé (USER testeur uniquement)
   */
  @Patch(':id/validate-price')
  @Roles('USER')
  @RequireKyc()
  @ApiBearerAuth('supabase-auth')
  @ApiOperation({
    summary: 'Valider le prix du produit trouvé (USER)',
    description:
      "Le testeur doit entrer le prix exact qu'il a trouvé pour le produit. Le système vérifie que le prix est dans la fourchette attendue [prix - 5€, prix + 5€] (ou [0€, 5€] si prix < 5€). Cette étape est obligatoire avant de pouvoir acheter le produit.",
  })
  @ApiParam({ name: 'id', description: 'ID de la session' })
  @ApiResponse({
    status: 200,
    description: 'Prix validé avec succès',
    type: SessionResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Prix hors de la fourchette acceptable',
  })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Accès refusé' })
  @ApiResponse({ status: 404, description: 'Session non trouvée' })
  async validateProductPrice(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() validatePriceDto: ValidateProductPriceDto,
  ): Promise<SessionResponseDto> {
    return this.sessionsService.validateProductPrice(
      id,
      user.id,
      validatePriceDto.productPrice,
    );
  }

  /**
   * 4. Soumettre la preuve d'achat (USER testeur uniquement)
   */
  @Patch(':id/submit-purchase')
  @Roles('USER')
  @RequireKyc()
  @ApiBearerAuth('supabase-auth')
  @ApiOperation({
    summary: "Soumettre la preuve d'achat (USER)",
    description:
      "Permet au testeur de soumettre la preuve d'achat du produit (reçu, confirmation) après l'avoir acheté.",
  })
  @ApiParam({ name: 'id', description: 'ID de la session' })
  @ApiResponse({
    status: 200,
    description: "Preuve d'achat soumise avec succès",
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
  @RequireKyc()
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
   * 6.1 Noter un testeur quand la campagne est terminée (PRO uniquement)
   */
  @Post(':id/rate')
  @Roles('PRO', 'ADMIN')
  @ApiBearerAuth('supabase-auth')
  @ApiOperation({
    summary: 'Noter un testeur (PRO/ADMIN)',
    description:
      'Permet au vendeur de noter un testeur quand la campagne est terminée, même si la session n\'est pas encore COMPLETED.',
  })
  @ApiParam({ name: 'id', description: 'ID de la session' })
  @ApiResponse({
    status: 201,
    description: 'Testeur noté avec succès',
    type: SessionResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Campagne non terminée ou testeur déjà noté',
  })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Accès refusé' })
  @ApiResponse({ status: 404, description: 'Session non trouvée' })
  async rateTester(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() rateTesterDto: RateTesterDto,
  ): Promise<SessionResponseDto> {
    const isAdmin = user.role === 'ADMIN';
    return this.sessionsService.rateTester(id, user.id, rateTesterDto, isAdmin);
  }

  /**
   * 6.2 Modifier la notation d'un testeur (PRO uniquement)
   */
  @Patch(':id/rate')
  @Roles('PRO', 'ADMIN')
  @ApiBearerAuth('supabase-auth')
  @ApiOperation({
    summary: 'Modifier la notation d\'un testeur (PRO/ADMIN)',
    description:
      'Permet au vendeur de modifier la note d\'un testeur déjà noté.',
  })
  @ApiParam({ name: 'id', description: 'ID de la session' })
  @ApiResponse({
    status: 200,
    description: 'Note modifiée avec succès',
    type: SessionResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Testeur pas encore noté',
  })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Accès refusé' })
  @ApiResponse({ status: 404, description: 'Session non trouvée' })
  async updateTesterRating(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() rateTesterDto: RateTesterDto,
  ): Promise<SessionResponseDto> {
    const isAdmin = user.role === 'ADMIN';
    return this.sessionsService.updateTesterRating(
      id,
      user.id,
      rateTesterDto,
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
      "Permet au testeur d'annuler sa participation à une session de test.",
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
    return this.sessionsService.cancelSession(id, user.id, cancelSessionDto);
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
   * 9. Compléter une étape de test (USER uniquement)
   * IMPORTANT: Cette route doit être AVANT @Get(':id') pour être matchée correctement
   */
  @Post(':id/steps/:stepId/complete')
  @Roles('USER')
  @RequireKyc()
  @ApiBearerAuth('supabase-auth')
  @ApiOperation({
    summary: 'Compléter une étape de test (USER)',
    description:
      'Permet au testeur de compléter une étape spécifique du test. La progression est sauvegardée automatiquement. Quand toutes les étapes obligatoires sont complétées, la session passe automatiquement à PROCEDURES_COMPLETED.',
  })
  @ApiParam({ name: 'id', description: 'ID de la session' })
  @ApiParam({ name: 'stepId', description: 'ID de l\'étape à compléter' })
  @ApiResponse({
    status: 201,
    description: 'Étape complétée avec succès',
    schema: {
      type: 'object',
      properties: {
        stepProgress: {
          type: 'object',
          description: 'Enregistrement de progression de l\'étape',
        },
        allRequiredStepsCompleted: {
          type: 'boolean',
          description: 'Toutes les étapes obligatoires sont-elles complétées?',
        },
        sessionStatus: {
          type: 'string',
          description: 'Nouveau statut de la session',
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description:
      'Statut invalide, étape non trouvée ou réponse invalide pour le type d\'étape',
  })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'KYC non vérifié ou pas le testeur' })
  @ApiResponse({ status: 404, description: 'Session ou étape non trouvée' })
  async completeStep(
    @Param('id') sessionId: string,
    @Param('stepId') stepId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CompleteStepDto,
  ): Promise<any> {
    return this.sessionsService.completeStep(
      sessionId,
      stepId,
      user.id,
      dto,
    );
  }

  /**
   * 10. Lister les sessions avec filtres
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
    summary: "Détails d'une session",
    description:
      "Récupère les détails complets d'une session (testeur, vendeur propriétaire ou admin uniquement).",
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
   * 12. Valider l'achat (PRO uniquement)
   */
  @Patch(':id/validate-purchase')
  @Roles('PRO', 'ADMIN')
  @ApiBearerAuth('supabase-auth')
  @ApiOperation({
    summary: 'Valider l\'achat soumis par le testeur (PRO)',
    description:
      'Permet au vendeur de valider l\'achat après soumission du numéro de commande. Passe la session de PURCHASE_SUBMITTED à PURCHASE_VALIDATED.',
  })
  @ApiParam({ name: 'id', description: 'ID de la session' })
  @ApiResponse({
    status: 200,
    description: 'Achat validé avec succès',
    type: SessionResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Statut invalide ou numéro de commande manquant',
  })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Accès refusé - pas propriétaire' })
  @ApiResponse({ status: 404, description: 'Session non trouvée' })
  async validatePurchase(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: ValidatePurchaseDto,
  ): Promise<SessionResponseDto> {
    return this.sessionsService.validatePurchase(id, user.id, dto);
  }

  /**
   * 13. Rejeter l'achat (PRO uniquement)
   */
  @Patch(':id/reject-purchase')
  @Roles('PRO', 'ADMIN')
  @ApiBearerAuth('supabase-auth')
  @ApiOperation({
    summary: 'Rejeter l\'achat soumis par le testeur (PRO)',
    description:
      'Permet au vendeur de rejeter l\'achat avec une raison obligatoire. Le testeur devra corriger et resoumettre.',
  })
  @ApiParam({ name: 'id', description: 'ID de la session' })
  @ApiResponse({
    status: 200,
    description: 'Achat rejeté avec succès',
    type: SessionResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Statut invalide' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Accès refusé - pas propriétaire' })
  @ApiResponse({ status: 404, description: 'Session non trouvée' })
  async rejectPurchase(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: RejectPurchaseDto,
  ): Promise<SessionResponseDto> {
    return this.sessionsService.rejectPurchase(id, user.id, dto);
  }

  /**
   * 14. Valider le test et demander des UGC (PRO uniquement)
   */
  @Patch(':id/validate-and-request-ugc')
  @Roles('PRO', 'ADMIN')
  @ApiBearerAuth('supabase-auth')
  @ApiOperation({
    summary: 'Valider le test et demander des UGC supplémentaires (PRO)',
    description:
      'Permet au vendeur de valider le test soumis, noter le testeur et demander des contenus UGC (vidéos, photos, avis) avec des bonus. Passe de SUBMITTED à UGC_REQUESTED.',
  })
  @ApiParam({ name: 'id', description: 'ID de la session' })
  @ApiResponse({
    status: 200,
    description: 'Test validé et UGC demandés avec succès',
    type: SessionResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Statut invalide, note incorrecte ou aucune demande UGC',
  })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Accès refusé - pas propriétaire' })
  @ApiResponse({ status: 404, description: 'Session non trouvée' })
  async validateAndRequestUGC(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: ValidateAndRequestUGCDto,
  ): Promise<SessionResponseDto> {
    return this.sessionsService.validateAndRequestUGC(id, user.id, dto);
  }

  /**
   * 15. Soumettre les UGC (USER uniquement)
   */
  @Patch(':id/submit-ugc')
  @Roles('USER')
  @ApiBearerAuth('supabase-auth')
  @ApiOperation({
    summary: 'Soumettre les contenus UGC demandés (USER)',
    description:
      'Permet au testeur de soumettre les contenus UGC demandés par le vendeur (vidéos, photos, avis). Passe de UGC_REQUESTED à UGC_SUBMITTED.',
  })
  @ApiParam({ name: 'id', description: 'ID de la session' })
  @ApiResponse({
    status: 200,
    description: 'UGC soumis avec succès',
    type: SessionResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Statut invalide ou aucune soumission',
  })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Accès refusé - pas le testeur' })
  @ApiResponse({ status: 404, description: 'Session non trouvée' })
  async submitUGC(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: SubmitUGCDto,
  ): Promise<SessionResponseDto> {
    return this.sessionsService.submitUGC(id, user.id, dto);
  }

  /**
   * 16. Refuser de soumettre les UGC (USER uniquement)
   */
  @Patch(':id/decline-ugc')
  @Roles('USER')
  @ApiBearerAuth('supabase-auth')
  @ApiOperation({
    summary: 'Refuser de soumettre les UGC (USER)',
    description:
      'Permet au testeur de refuser de soumettre les UGC avec une raison obligatoire. Passe de UGC_REQUESTED à PENDING_CLOSURE sans bonus.',
  })
  @ApiParam({ name: 'id', description: 'ID de la session' })
  @ApiResponse({
    status: 200,
    description: 'Refus enregistré avec succès',
    type: SessionResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Statut invalide' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Accès refusé - pas le testeur' })
  @ApiResponse({ status: 404, description: 'Session non trouvée' })
  async declineUGC(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: DeclineUGCDto,
  ): Promise<SessionResponseDto> {
    return this.sessionsService.declineUGC(id, user.id, dto);
  }

  /**
   * 17. Valider les UGC soumis (PRO uniquement)
   */
  @Patch(':id/validate-ugc')
  @Roles('PRO', 'ADMIN')
  @ApiBearerAuth('supabase-auth')
  @ApiOperation({
    summary: 'Valider les UGC soumis par le testeur (PRO)',
    description:
      'Permet au vendeur de valider les UGC soumis. Passe de UGC_SUBMITTED à PENDING_CLOSURE.',
  })
  @ApiParam({ name: 'id', description: 'ID de la session' })
  @ApiResponse({
    status: 200,
    description: 'UGC validés avec succès',
    type: SessionResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Statut invalide' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Accès refusé - pas propriétaire' })
  @ApiResponse({ status: 404, description: 'Session non trouvée' })
  async validateUGC(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: ValidateUGCDto,
  ): Promise<SessionResponseDto> {
    return this.sessionsService.validateUGC(id, user.id, dto);
  }

  /**
   * 18. Rejeter les UGC soumis (PRO uniquement)
   */
  @Patch(':id/reject-ugc')
  @Roles('PRO', 'ADMIN')
  @ApiBearerAuth('supabase-auth')
  @ApiOperation({
    summary: 'Rejeter les UGC soumis par le testeur (PRO)',
    description:
      'Permet au vendeur de rejeter les UGC avec une raison obligatoire. Repasse de UGC_SUBMITTED à UGC_REQUESTED pour correction.',
  })
  @ApiParam({ name: 'id', description: 'ID de la session' })
  @ApiResponse({
    status: 200,
    description: 'UGC rejetés avec succès',
    type: SessionResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Statut invalide' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Accès refusé - pas propriétaire' })
  @ApiResponse({ status: 404, description: 'Session non trouvée' })
  async rejectUGC(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: RejectUGCDto,
  ): Promise<SessionResponseDto> {
    return this.sessionsService.rejectUGC(id, user.id, dto);
  }

  /**
   * 19. Clôturer la session (PRO uniquement)
   */
  @Patch(':id/close')
  @Roles('PRO', 'ADMIN')
  @ApiBearerAuth('supabase-auth')
  @ApiOperation({
    summary: 'Clôturer la session (PRO)',
    description:
      'Permet au vendeur de clôturer définitivement la session. Si des UGC ont été validés, crédite le bonus au testeur. Passe de PENDING_CLOSURE à COMPLETED.',
  })
  @ApiParam({ name: 'id', description: 'ID de la session' })
  @ApiResponse({
    status: 200,
    description: 'Session clôturée avec succès',
    type: SessionResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Statut invalide' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Accès refusé - pas propriétaire' })
  @ApiResponse({ status: 404, description: 'Session non trouvée' })
  async closeSession(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CloseSessionDto,
  ): Promise<SessionResponseDto> {
    return this.sessionsService.closeSession(id, user.id, dto);
  }

  /**
   * 20. Supprimer une session (ADMIN uniquement)
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
