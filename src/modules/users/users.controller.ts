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
  ForbiddenException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
  ApiParam,
  ApiBody,
} from '@nestjs/swagger';
import { UsersService } from './users.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { SupabaseAuthGuard } from '../../common/guards/supabase-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser, CurrentProfile } from '../../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import type { Profile } from '@prisma/client';
import { ProfileResponseDto } from './dto/profile.dto';
import type { PaginatedResponse } from '../../common/dto/pagination.dto';
import { ProOverviewDto } from './dto/pro-overview.dto';

@ApiTags('users')
@Controller('users')
@UseGuards(SupabaseAuthGuard, RolesGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Roles('ADMIN')
  @Get('profiles')
  @ApiBearerAuth('supabase-auth')
  @ApiOperation({
    summary: 'Liste des profils (Admin)',
    description: 'Récupère tous les profils avec filtres optionnels et pagination',
  })
  @ApiQuery({
    name: 'role',
    required: false,
    enum: ['USER', 'PRO', 'ADMIN'],
    description: 'Filtrer par rôle',
  })
  @ApiQuery({
    name: 'isActive',
    required: false,
    type: Boolean,
    description: 'Filtrer par statut actif',
  })
  @ApiQuery({
    name: 'isVerified',
    required: false,
    type: Boolean,
    description: 'Filtrer par vérification',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Numéro de page (défaut: 1)',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Nombre de résultats par page (défaut: 20, max: 100)',
  })
  @ApiResponse({
    status: 200,
    description: 'Liste paginée des profils',
  })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Rôle admin requis' })
  findAll(
    @Query('role') role?: string,
    @Query('isActive') isActive?: string,
    @Query('isVerified') isVerified?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ): Promise<PaginatedResponse<Profile>> {
    return this.usersService.getAllProfiles({
      role,
      isActive:
        isActive === 'true' ? true : isActive === 'false' ? false : undefined,
      isVerified:
        isVerified === 'true'
          ? true
          : isVerified === 'false'
            ? false
            : undefined,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  @Get('me')
  @ApiBearerAuth('supabase-auth')
  @ApiOperation({
    summary: 'Mon profil',
    description: "Récupère le profil de l'utilisateur connecté",
  })
  @ApiResponse({
    status: 200,
    description: 'Profil utilisateur',
    type: ProfileResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 404, description: 'Profil non trouvé' })
  getMyProfile(@CurrentProfile() profile: Profile) {
    // Profile is already loaded by the auth guard, no extra query needed
    return profile;
  }

  @Roles('USER')
  @Post('me/verify/initiate')
  @ApiBearerAuth('supabase-auth')
  @ApiOperation({
    summary: 'Initier vérification KYC (Testeurs uniquement)',
    description: "Démarre le processus de vérification d'identité via Stripe Identity",
  })
  @ApiResponse({
    status: 200,
    description: 'Session de vérification créée',
    schema: {
      type: 'object',
      properties: {
        verification_url: {
          type: 'string',
          description: 'URL Stripe Identity pour compléter la vérification',
          example: 'https://verify.stripe.com/start/vs_...',
        },
        session_id: {
          type: 'string',
          description: 'ID de la session de vérification',
          example: 'vs_1A2B3C4D5E6F',
        },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Réservé aux testeurs (USER role)' })
  @ApiResponse({ status: 400, description: 'Utilisateur déjà vérifié' })
  async initiateVerification(@CurrentUser() user: AuthenticatedUser) {
    return this.usersService.initiateStripeVerification(user.id);
  }

  @Get('me/verify/status')
  @ApiBearerAuth('supabase-auth')
  @ApiOperation({
    summary: 'Statut de vérification KYC',
    description: "Récupère le statut actuel de la vérification d'identité",
  })
  @ApiResponse({
    status: 200,
    description: 'Statut de vérification',
    schema: {
      type: 'object',
      properties: {
        status: {
          type: 'string',
          enum: ['unverified', 'pending', 'verified', 'failed'],
          example: 'verified',
        },
        verified_at: {
          type: 'string',
          format: 'date-time',
          example: '2025-12-08T10:30:00Z',
          nullable: true,
        },
        failure_reason: {
          type: 'string',
          example: null,
          nullable: true,
        },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 404, description: 'Profil non trouvé' })
  async getVerificationStatus(@CurrentUser() user: AuthenticatedUser) {
    return this.usersService.getVerificationStatus(user.id);
  }

  @Roles('USER')
  @Post('me/verify/retry')
  @ApiBearerAuth('supabase-auth')
  @ApiOperation({
    summary: 'Réessayer vérification KYC',
    description: 'Réinitialise et relance le processus de vérification après un échec',
  })
  @ApiResponse({
    status: 200,
    description: 'Nouvelle session de vérification créée',
    schema: {
      type: 'object',
      properties: {
        verification_url: {
          type: 'string',
          description: 'URL Stripe Identity pour compléter la vérification',
          example: 'https://verify.stripe.com/start/vs_...',
        },
        session_id: {
          type: 'string',
          description: 'ID de la nouvelle session de vérification',
          example: 'vs_1G2H3I4J5K6L',
        },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Réservé aux testeurs (USER role)' })
  @ApiResponse({ status: 400, description: 'Utilisateur déjà vérifié' })
  async retryVerification(@CurrentUser() user: AuthenticatedUser) {
    return this.usersService.retryVerification(user.id);
  }

  @Roles('PRO')
  @Get('me/overview')
  @ApiBearerAuth('supabase-auth')
  @ApiOperation({
    summary: 'Overview PRO',
    description: 'Récupère les KPIs et statistiques pour un vendeur PRO (dashboard)',
  })
  @ApiResponse({
    status: 200,
    description: 'Overview du vendeur PRO',
    type: ProOverviewDto,
  })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Réservé aux utilisateurs PRO' })
  async getProOverview(@CurrentUser() user: AuthenticatedUser): Promise<ProOverviewDto> {
    return this.usersService.getProOverview(user.id);
  }

  @Get('profiles/:id')
  @ApiBearerAuth('supabase-auth')
  @ApiOperation({
    summary: 'Profil par ID',
    description: 'Récupère un profil spécifique (admin ou son propre profil)',
  })
  @ApiParam({
    name: 'id',
    description: 'ID du profil',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 200,
    description: 'Profil récupéré',
    type: ProfileResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Accès interdit' })
  @ApiResponse({ status: 404, description: 'Profil non trouvé' })
  async findOne(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const profile = await this.usersService.getProfileById(id);

    // Users can only view their own profile unless they're admin
    if (user.role !== 'ADMIN' && profile.id !== user.id) {
      throw new ForbiddenException('You can only view your own profile');
    }

    return profile;
  }

  @Patch('me')
  @ApiBearerAuth('supabase-auth')
  @ApiOperation({
    summary: 'Mettre à jour mon profil',
    description: "Met à jour le profil de l'utilisateur connecté",
  })
  @ApiResponse({
    status: 200,
    description: 'Profil mis à jour',
    type: ProfileResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 400, description: 'Données invalides' })
  updateMyProfile(
    @CurrentUser() user: AuthenticatedUser,
    @Body() updateProfileDto: UpdateProfileDto,
  ) {
    // Prevent users from changing their own role or active status
    const {
      role: _role,
      isActive: _isActive,
      isVerified: _isVerified,
      ...safeUpdate
    } = updateProfileDto;
    return this.usersService.updateProfile(user.id, safeUpdate);
  }

  @Patch('me/device-token')
  @ApiBearerAuth('supabase-auth')
  @ApiOperation({
    summary: 'Enregistrer mon device token (push notifications)',
    description: 'Enregistre ou met à jour le device token FCM pour les notifications push',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        deviceToken: {
          type: 'string',
          description: 'Firebase Cloud Messaging device token',
          example: 'eXyZ1234abcd...',
        },
      },
      required: ['deviceToken'],
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Device token enregistré',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: { type: 'string', example: 'Device token updated successfully' },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  async updateDeviceToken(
    @CurrentUser() user: AuthenticatedUser,
    @Body('deviceToken') deviceToken: string,
  ) {
    await this.usersService.updateDeviceToken(user.id, deviceToken);
    return {
      success: true,
      message: 'Device token updated successfully',
    };
  }

  @Delete('me/device-token')
  @ApiBearerAuth('supabase-auth')
  @ApiOperation({
    summary: 'Supprimer mon device token',
    description: 'Supprime le device token (désinscription des push notifications)',
  })
  @ApiResponse({
    status: 200,
    description: 'Device token supprimé',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: { type: 'string', example: 'Device token removed successfully' },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  async removeDeviceToken(@CurrentUser() user: AuthenticatedUser) {
    await this.usersService.updateDeviceToken(user.id, null);
    return {
      success: true,
      message: 'Device token removed successfully',
    };
  }

  @Roles('ADMIN')
  @Patch('profiles/:id')
  @ApiBearerAuth('supabase-auth')
  @ApiOperation({
    summary: 'Mettre à jour profil (Admin)',
    description: "Met à jour n'importe quel profil",
  })
  @ApiParam({ name: 'id', description: 'ID du profil' })
  @ApiResponse({
    status: 200,
    description: 'Profil mis à jour',
    type: ProfileResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Rôle admin requis' })
  @ApiResponse({ status: 404, description: 'Profil non trouvé' })
  update(@Param('id') id: string, @Body() updateProfileDto: UpdateProfileDto) {
    return this.usersService.updateProfile(id, updateProfileDto);
  }

  @Roles('ADMIN')
  @Post('profiles/:id/verify')
  @ApiBearerAuth('supabase-auth')
  @ApiOperation({
    summary: 'Vérifier profil (Admin)',
    description: 'Marque un profil comme vérifié',
  })
  @ApiParam({ name: 'id', description: 'ID du profil' })
  @ApiResponse({
    status: 200,
    description: 'Profil vérifié',
    type: ProfileResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Rôle admin requis' })
  @ApiResponse({ status: 404, description: 'Profil non trouvé' })
  verify(@Param('id') id: string) {
    return this.usersService.verifyProfile(id);
  }

  @Roles('ADMIN')
  @Patch('profiles/:id/role')
  @ApiBearerAuth('supabase-auth')
  @ApiOperation({
    summary: 'Changer rôle (Admin)',
    description: "Change le rôle d'un utilisateur",
  })
  @ApiParam({ name: 'id', description: 'ID du profil' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: { role: { type: 'string', enum: ['USER', 'PRO', 'ADMIN'] } },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Rôle modifié',
    type: ProfileResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Rôle admin requis' })
  @ApiResponse({ status: 404, description: 'Profil non trouvé' })
  changeRole(
    @Param('id') id: string,
    @Body('role') role: 'USER' | 'PRO' | 'ADMIN',
  ) {
    return this.usersService.changeRole(id, role);
  }

  @Roles('ADMIN')
  @Delete('profiles/:id')
  @ApiBearerAuth('supabase-auth')
  @ApiOperation({
    summary: 'Désactiver profil (Admin)',
    description: 'Désactive un profil (soft delete)',
  })
  @ApiParam({ name: 'id', description: 'ID du profil' })
  @ApiResponse({ status: 200, description: 'Profil désactivé' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Rôle admin requis' })
  @ApiResponse({ status: 404, description: 'Profil non trouvé' })
  remove(@Param('id') id: string) {
    return this.usersService.deleteProfile(id);
  }
}
