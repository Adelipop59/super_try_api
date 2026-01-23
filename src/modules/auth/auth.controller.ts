import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  Param,
  Query,
  Patch,
  Res,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request, Response } from 'express';
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
  CheckEmailDto,
  CheckEmailResponseDto,
  CompleteOnboardingDto,
} from './dto/auth.dto';
import { ProfileResponseDto } from '../users/dto/profile.dto';
import {
  COOKIE_NAMES,
  COOKIE_EXPIRY,
  getCookieOptions,
} from '../../common/constants/cookie.constants';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Public()
  @Post('signup')
  @ApiOperation({
    summary: 'Inscription',
    description:
      "Crée un compte utilisateur et retourne les tokens d'authentification dans des cookies httpOnly.",
  })
  @ApiResponse({
    status: 201,
    description: 'Compte créé avec succès',
    type: AuthResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Données invalides' })
  @ApiResponse({ status: 409, description: 'Email déjà utilisé' })
  async signup(
    @Body() signupDto: SignupDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthResponseDto> {
    const authData = await this.authService.signup(signupDto);

    // Set httpOnly cookies for tokens
    const isProduction = process.env.NODE_ENV === 'production';

    res.cookie(
      COOKIE_NAMES.ACCESS_TOKEN,
      authData.access_token,
      getCookieOptions(isProduction, COOKIE_EXPIRY.ACCESS_TOKEN),
    );

    res.cookie(
      COOKIE_NAMES.REFRESH_TOKEN,
      authData.refresh_token,
      getCookieOptions(isProduction, COOKIE_EXPIRY.REFRESH_TOKEN),
    );

    // Return response without tokens (they're now in cookies)
    return authData;
  }

  @Public()
  @Post('check-email')
  @ApiOperation({
    summary: 'Vérifier si un email existe',
    description: 'Vérifie si un compte existe avec cette adresse email. Utile pour le flow d\'inscription/connexion.',
  })
  @ApiResponse({
    status: 200,
    description: 'Vérification effectuée',
    type: CheckEmailResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Email invalide' })
  async checkEmail(@Body() checkEmailDto: CheckEmailDto): Promise<CheckEmailResponseDto> {
    return this.authService.checkEmailExists(checkEmailDto.email);
  }

  @Public()
  @Post('login')
  @ApiOperation({
    summary: 'Connexion',
    description: 'Authentifie un utilisateur et retourne les tokens dans des cookies httpOnly.',
  })
  @ApiResponse({
    status: 200,
    description: 'Connexion réussie',
    type: AuthResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Email ou mot de passe incorrect' })
  async login(
    @Body() loginDto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthResponseDto> {
    const authData = await this.authService.login(loginDto);

    // Set httpOnly cookies for tokens
    const isProduction = process.env.NODE_ENV === 'production';

    res.cookie(
      COOKIE_NAMES.ACCESS_TOKEN,
      authData.access_token,
      getCookieOptions(isProduction, COOKIE_EXPIRY.ACCESS_TOKEN),
    );

    res.cookie(
      COOKIE_NAMES.REFRESH_TOKEN,
      authData.refresh_token,
      getCookieOptions(isProduction, COOKIE_EXPIRY.REFRESH_TOKEN),
    );

    // Return response without tokens (they're now in cookies)
    return authData;
  }

  @Public()
  @Get('check-session')
  @ApiOperation({
    summary: 'Vérifier la session utilisateur',
    description: 'Retourne le profil si connecté, null sinon. Ne retourne jamais 401, toujours 200.',
  })
  @ApiResponse({
    status: 200,
    description: 'Session vérifiée',
    schema: {
      oneOf: [
        { $ref: '#/components/schemas/ProfileResponseDto' },
        { type: 'object', properties: { user: { type: 'null' } } },
      ],
    },
  })
  async checkSession(@Req() req: Request): Promise<{ user: ProfileResponseDto | null }> {
    try {
      // Récupérer le token depuis les cookies
      const accessToken = req.cookies?.[COOKIE_NAMES.ACCESS_TOKEN];

      if (!accessToken) {
        return { user: null };
      }

      // Vérifier le token avec Supabase
      const { data, error } = await this.authService.getSupabaseClient().auth.getUser(accessToken);

      if (error || !data.user) {
        return { user: null };
      }

      // Récupérer le profil
      const profile = await this.authService.getUserProfile(data.user.id);

      if (!profile) {
        return { user: null };
      }

      return { user: profile as ProfileResponseDto };
    } catch {
      return { user: null };
    }
  }

  @Public()
  @Post('store-oauth-tokens')
  @ApiOperation({
    summary: 'Stocker les tokens OAuth dans des cookies',
    description: 'Endpoint pour stocker les tokens OAuth reçus en URL fragment dans des cookies httpOnly',
  })
  @ApiResponse({
    status: 200,
    description: 'Tokens stockés avec succès',
    type: MessageResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Tokens manquants' })
  async storeOAuthTokens(
    @Body() body: { access_token: string; refresh_token: string },
    @Res({ passthrough: true }) res: Response,
  ): Promise<MessageResponseDto> {
    if (!body.access_token || !body.refresh_token) {
      throw new UnauthorizedException('Tokens manquants');
    }

    const isProduction = process.env.NODE_ENV === 'production';

    res.cookie(
      COOKIE_NAMES.ACCESS_TOKEN,
      body.access_token,
      getCookieOptions(isProduction, COOKIE_EXPIRY.ACCESS_TOKEN),
    );

    res.cookie(
      COOKIE_NAMES.REFRESH_TOKEN,
      body.refresh_token,
      getCookieOptions(isProduction, COOKIE_EXPIRY.REFRESH_TOKEN),
    );

    return { message: 'Tokens OAuth stockés avec succès' };
  }

  @Public()
  @Post('refresh')
  @ApiOperation({
    summary: 'Rafraîchir le token',
    description: "Génère un nouveau token d'accès à partir du refresh token cookie",
  })
  @ApiResponse({
    status: 200,
    description: 'Token rafraîchi avec succès',
    type: RefreshTokenResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Refresh token invalide ou expiré' })
  async refreshToken(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
    @Body() refreshTokenDto?: RefreshTokenDto,
  ): Promise<RefreshTokenResponseDto> {
    // Read refresh_token from cookie (priority) or body (backward compatibility)
    const refreshToken =
      req.cookies?.[COOKIE_NAMES.REFRESH_TOKEN] ||
      refreshTokenDto?.refresh_token;

    if (!refreshToken) {
      throw new UnauthorizedException('Refresh token not found in cookies or body');
    }

    const authData = await this.authService.refreshToken(refreshToken);

    // Set new access_token in cookie
    const isProduction = process.env.NODE_ENV === 'production';

    res.cookie(
      COOKIE_NAMES.ACCESS_TOKEN,
      authData.access_token,
      getCookieOptions(isProduction, COOKIE_EXPIRY.ACCESS_TOKEN),
    );

    // Return response without token (it's now in cookie)
    return authData;
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
  @Get('ws-token')
  @ApiBearerAuth('supabase-auth')
  @ApiOperation({
    summary: 'Obtenir un token temporaire pour WebSocket',
    description: 'Génère un token temporaire pour l\'authentification WebSocket',
  })
  @ApiResponse({ status: 200, description: 'Token WebSocket généré' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  getWebSocketToken(@CurrentUser() user: AuthenticatedUser, @Req() req: Request) {
    // Extract the access_token from cookie
    const token = req.cookies?.[COOKIE_NAMES.ACCESS_TOKEN];

    return {
      token,
      userId: user.id,
      expiresIn: 300, // 5 minutes
    };
  }

  @UseGuards(SupabaseAuthGuard)
  @Post('logout')
  @ApiBearerAuth('supabase-auth')
  @ApiOperation({
    summary: 'Déconnexion',
    description: "Déconnecte l'utilisateur, invalide le token et efface les cookies",
  })
  @ApiResponse({
    status: 200,
    description: 'Déconnexion réussie',
    type: MessageResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Token invalide ou manquant' })
  async logout(
    @CurrentUser() user: AuthenticatedUser,
    @Res({ passthrough: true }) res: Response,
  ): Promise<MessageResponseDto> {
    const result = await this.authService.logout(user.supabaseUserId);

    // Clear cookies with same options as when they were set
    const isProduction = process.env.NODE_ENV === 'production';

    res.clearCookie(COOKIE_NAMES.ACCESS_TOKEN, {
      path: '/',
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? 'strict' : 'lax',
      domain: process.env.COOKIE_DOMAIN || undefined,
    });

    res.clearCookie(COOKIE_NAMES.REFRESH_TOKEN, {
      path: '/',
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? 'strict' : 'lax',
      domain: process.env.COOKIE_DOMAIN || undefined,
    });

    return result;
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
      "Génère l'URL de redirection pour l'authentification OAuth (Google, GitHub, Microsoft)",
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
    return this.authService.initiateOAuth(provider as 'google' | 'github' | 'microsoft');
  }

  @Public()
  @Get('oauth/callback')
  @ApiOperation({
    summary: 'Callback OAuth',
    description:
      'Gère le callback OAuth après authentification avec le provider externe',
  })
  @ApiResponse({ status: 302, description: 'Redirection vers frontend' })
  @ApiResponse({ status: 400, description: 'Code OAuth invalide' })
  async handleOAuthCallback(
    @Query('code') code: string,
    @Query('error') error: string,
    @Query('error_description') errorDescription: string,
    @Res({ passthrough: false }) res: Response,
  ) {
    console.log('[OAuth Callback] ========== START ==========');
    console.log('[OAuth Callback] Received code:', code ? 'PRESENT' : 'MISSING');
    console.log('[OAuth Callback] Received error:', error || 'NONE');
    console.log('[OAuth Callback] Error description:', errorDescription || 'NONE');

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3001';
    console.log('[OAuth Callback] Frontend URL:', frontendUrl);

    // Handle OAuth errors from provider
    if (error) {
      const encodedError = encodeURIComponent(errorDescription || error);
      const redirectUrl = `${frontendUrl}/auth/error?error=${encodedError}`;
      console.log('[OAuth Callback] Provider error, redirecting to:', redirectUrl);
      return res.redirect(redirectUrl);
    }

    // Handle missing code
    if (!code) {
      const redirectUrl = `${frontendUrl}/auth/error?error=Code OAuth manquant`;
      console.log('[OAuth Callback] Code missing, redirecting to:', redirectUrl);
      return res.redirect(redirectUrl);
    }

    try {
      console.log('[OAuth Callback] Exchanging code for session with Supabase...');
      const authData = await this.authService.handleOAuthCallback(code, '');
      console.log('[OAuth Callback] Session exchange successful');
      console.log('[OAuth Callback] User ID:', authData.profile?.id);

      // Redirect to frontend with tokens in URL fragment
      // Frontend will store them as httpOnly cookies via an API call
      const redirectUrl = `${frontendUrl}/auth/callback#access_token=${encodeURIComponent(authData.access_token)}&refresh_token=${encodeURIComponent(authData.refresh_token)}&token_type=bearer&expires_in=${authData.expires_in}`;
      console.log('[OAuth Callback] Redirecting to frontend callback with tokens in URL fragment');
      console.log('[OAuth Callback] Redirect URL:', redirectUrl.substring(0, 100) + '...');
      console.log('[OAuth Callback] ========== END SUCCESS ==========');

      return res.redirect(redirectUrl);
    } catch (err) {
      console.error('[OAuth Callback] ========== ERROR ==========');
      console.error('[OAuth Callback] Error during callback:', err);
      const errorMsg = err instanceof Error ? err.message : 'Erreur OAuth inconnue';
      const redirectUrl = `${frontendUrl}/auth/error?error=${encodeURIComponent(errorMsg)}`;
      console.log('[OAuth Callback] Redirecting to error page:', redirectUrl);
      console.log('[OAuth Callback] ========== END ERROR ==========');
      return res.redirect(redirectUrl);
    }
  }

  @Public()
  @Get('verify-email-callback')
  @ApiOperation({
    summary: 'Callback après vérification email',
    description: 'Redirige vers le frontend après vérification email Supabase',
  })
  @ApiResponse({ status: 302, description: 'Redirection vers frontend' })
  async verifyEmailCallback(
    @Query('token_hash') tokenHash: string,
    @Query('type') type: string,
    @Res() res: Response,
  ) {
    // Supabase gère automatiquement la vérification via le token
    // On redirige simplement vers le frontend avec un message de succès
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3001';
    return res.redirect(`${frontendUrl}/auth/email-verified?success=true`);
  }

  @UseGuards(SupabaseAuthGuard)
  @Post('complete-onboarding')
  @ApiBearerAuth('supabase-auth')
  @ApiOperation({
    summary: "Compléter l'onboarding après OAuth",
    description: "Finalise le profil d'un utilisateur OAuth en ajoutant le rôle, pays et autres informations obligatoires",
  })
  @ApiResponse({
    status: 200,
    description: 'Onboarding complété avec succès',
    type: ProfileResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Données invalides ou onboarding déjà complété' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 404, description: 'Profil non trouvé' })
  async completeOnboarding(
    @CurrentUser() user: AuthenticatedUser,
    @Body() completeOnboardingDto: CompleteOnboardingDto,
  ): Promise<ProfileResponseDto> {
    return this.authService.completeOnboarding(
      user.supabaseUserId,
      completeOnboardingDto,
    );
  }
}
