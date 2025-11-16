import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  Param,
  Query,
  Patch,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { SupabaseAuthGuard } from '../../common/guards/supabase-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import {
  SignupDto,
  LoginDto,
  AuthResponseDto,
  RefreshTokenDto,
  RefreshTokenResponseDto,
  ForgotPasswordDto,
  ResetPasswordDto,
  MessageResponseDto,
  ChangePasswordDto,
  UpdateEmailDto,
  OAuthUrlResponseDto,
} from './dto/auth.dto';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Public()
  @Post('signup')
  @ApiOperation({
    summary: 'Inscription',
    description:
      "Crée un compte utilisateur et retourne les tokens d'authentification.",
  })
  @ApiResponse({
    status: 201,
    description: 'Compte créé avec succès',
    type: AuthResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Données invalides' })
  @ApiResponse({ status: 409, description: 'Email déjà utilisé' })
  async signup(@Body() signupDto: SignupDto): Promise<AuthResponseDto> {
    return this.authService.signup(signupDto);
  }

  @Public()
  @Post('login')
  @ApiOperation({
    summary: 'Connexion',
    description: 'Authentifie un utilisateur et retourne les tokens.',
  })
  @ApiResponse({
    status: 200,
    description: 'Connexion réussie',
    type: AuthResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Email ou mot de passe incorrect' })
  async login(@Body() loginDto: LoginDto): Promise<AuthResponseDto> {
    return this.authService.login(loginDto);
  }

  @Public()
  @Post('refresh')
  @ApiOperation({
    summary: 'Rafraîchir le token',
    description: "Génère un nouveau token d'accès à partir du refresh token",
  })
  @ApiResponse({
    status: 200,
    description: 'Token rafraîchi avec succès',
    type: RefreshTokenResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Refresh token invalide ou expiré' })
  async refreshToken(
    @Body() refreshTokenDto: RefreshTokenDto,
  ): Promise<RefreshTokenResponseDto> {
    return this.authService.refreshToken(refreshTokenDto.refresh_token);
  }

  @Public()
  @Post('forgot-password')
  @ApiOperation({
    summary: 'Mot de passe oublié',
    description: 'Envoie un email de réinitialisation de mot de passe',
  })
  @ApiResponse({
    status: 200,
    description: 'Email envoyé avec succès',
    type: MessageResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Utilisateur non trouvé' })
  async forgotPassword(
    @Body() forgotPasswordDto: ForgotPasswordDto,
  ): Promise<MessageResponseDto> {
    return this.authService.forgotPassword(forgotPasswordDto.email);
  }

  @Public()
  @Post('reset-password')
  @ApiOperation({
    summary: 'Réinitialiser le mot de passe',
    description: 'Réinitialise le mot de passe avec le token reçu par email',
  })
  @ApiResponse({
    status: 200,
    description: 'Mot de passe réinitialisé avec succès',
    type: MessageResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Token invalide ou expiré' })
  async resetPassword(
    @Body() resetPasswordDto: ResetPasswordDto,
  ): Promise<MessageResponseDto> {
    return this.authService.resetPassword(
      resetPasswordDto.token,
      resetPasswordDto.password,
    );
  }

  @Public()
  @Post('resend-verification')
  @ApiOperation({
    summary: 'Renvoyer email de vérification',
    description: "Renvoie l'email de vérification pour confirmer le compte",
  })
  @ApiResponse({
    status: 200,
    description: 'Email de vérification envoyé',
    type: MessageResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Utilisateur non trouvé' })
  async resendVerification(
    @Body() body: { email: string },
  ): Promise<MessageResponseDto> {
    return this.authService.resendVerification(body.email);
  }

  @Public()
  @Get('health')
  @ApiOperation({
    summary: 'Health check',
    description: "Vérifie que le service d'authentification fonctionne",
  })
  @ApiResponse({ status: 200, description: 'Service opérationnel' })
  health() {
    return {
      status: 'ok',
      message: 'Auth service is running',
      timestamp: new Date().toISOString(),
    };
  }

  @UseGuards(SupabaseAuthGuard)
  @Get('verify')
  @ApiBearerAuth('supabase-auth')
  @ApiOperation({
    summary: 'Vérifier token',
    description:
      'Vérifie la validité du token JWT et retourne les infos utilisateur',
  })
  @ApiResponse({ status: 200, description: 'Token valide' })
  @ApiResponse({ status: 401, description: 'Token invalide ou manquant' })
  verify(@CurrentUser() user: AuthenticatedUser) {
    return {
      valid: true,
      user: {
        id: user.id,
        supabaseUserId: user.supabaseUserId,
        email: user.email,
        role: user.role,
      },
    };
  }

  @UseGuards(SupabaseAuthGuard)
  @Post('logout')
  @ApiBearerAuth('supabase-auth')
  @ApiOperation({
    summary: 'Déconnexion',
    description: "Déconnecte l'utilisateur et invalide le token",
  })
  @ApiResponse({
    status: 200,
    description: 'Déconnexion réussie',
    type: MessageResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Token invalide ou manquant' })
  async logout(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<MessageResponseDto> {
    return this.authService.logout(user.supabaseUserId);
  }

  @UseGuards(SupabaseAuthGuard)
  @Patch('change-password')
  @ApiBearerAuth('supabase-auth')
  @ApiOperation({
    summary: 'Changer le mot de passe',
    description:
      "Change le mot de passe de l'utilisateur connecté (nécessite l'ancien mot de passe)",
  })
  @ApiResponse({
    status: 200,
    description: 'Mot de passe modifié avec succès',
    type: MessageResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Ancien mot de passe incorrect' })
  @ApiResponse({ status: 401, description: 'Token invalide ou manquant' })
  async changePassword(
    @CurrentUser() user: AuthenticatedUser,
    @Body() changePasswordDto: ChangePasswordDto,
  ): Promise<MessageResponseDto> {
    return this.authService.changePassword(
      user.email,
      changePasswordDto.oldPassword,
      changePasswordDto.newPassword,
    );
  }

  @UseGuards(SupabaseAuthGuard)
  @Patch('update-email')
  @ApiBearerAuth('supabase-auth')
  @ApiOperation({
    summary: "Mettre à jour l'email",
    description:
      "Change l'adresse email de l'utilisateur connecté (nécessite le mot de passe)",
  })
  @ApiResponse({
    status: 200,
    description: 'Email mis à jour avec succès',
    type: MessageResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Mot de passe incorrect ou email déjà utilisé',
  })
  @ApiResponse({ status: 401, description: 'Token invalide ou manquant' })
  async updateEmail(
    @CurrentUser() user: AuthenticatedUser,
    @Body() updateEmailDto: UpdateEmailDto,
  ): Promise<MessageResponseDto> {
    return this.authService.updateEmail(
      user.supabaseUserId,
      updateEmailDto.email,
      updateEmailDto.password,
    );
  }

  @Public()
  @Get('oauth/:provider')
  @ApiOperation({
    summary: "Initier l'authentification OAuth",
    description:
      "Génère l'URL de redirection pour l'authentification OAuth (Google, GitHub, etc.)",
  })
  @ApiResponse({
    status: 200,
    description: 'URL OAuth générée',
    type: OAuthUrlResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Provider non supporté' })
  async initiateOAuth(
    @Param('provider') provider: string,
  ): Promise<OAuthUrlResponseDto> {
    return this.authService.initiateOAuth(provider as 'google' | 'github');
  }

  @Public()
  @Get('oauth/callback')
  @ApiOperation({
    summary: 'Callback OAuth',
    description:
      'Gère le callback OAuth après authentification avec le provider externe',
  })
  @ApiResponse({
    status: 200,
    description: 'Authentification OAuth réussie',
    type: AuthResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Code OAuth invalide' })
  async handleOAuthCallback(
    @Query('code') code: string,
    @Query('provider') provider: string,
  ): Promise<AuthResponseDto> {
    return this.authService.handleOAuthCallback(code, provider);
  }
}
