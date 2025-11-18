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
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { ProfileResponseDto } from './dto/profile.dto';

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
    description: 'Récupère tous les profils avec filtres optionnels',
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
  @ApiResponse({
    status: 200,
    description: 'Liste des profils',
    type: [ProfileResponseDto],
  })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Rôle admin requis' })
  findAll(
    @Query('role') role?: string,
    @Query('isActive') isActive?: string,
    @Query('isVerified') isVerified?: string,
  ) {
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
  getMyProfile(@CurrentUser() user: AuthenticatedUser) {
    return this.usersService.getProfileById(user.id);
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
