import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { SupabaseService } from '../../common/supabase/supabase.service';
import { PrismaService } from '../../database/prisma.service';
import { UsersService } from '../users/users.service';
import { ProfileResponseDto } from '../users/dto/profile.dto';
import {
  SignupDto,
  LoginDto,
  AuthResponseDto,
  RefreshTokenResponseDto,
  MessageResponseDto,
  OAuthUrlResponseDto,
} from './dto/auth.dto';

@Injectable()
export class AuthService {
  constructor(
    private supabaseService: SupabaseService,
    private prismaService: PrismaService,
    private usersService: UsersService,
  ) {}

  /**
   * Signup - Create Supabase user and profile
   */
  async signup(signupDto: SignupDto): Promise<AuthResponseDto> {
    const { email, password, role, ...profileData } = signupDto;

    // Create user in Supabase
    const { data, error } = await this.supabaseService
      .getAdminClient()
      .auth.admin.createUser({
        email,
        password,
        email_confirm: true, // Auto-confirm email
      });

    if (error || !data.user) {
      throw new BadRequestException(
        error?.message || 'Erreur lors de la création du compte',
      );
    }

    // Create profile in database using UsersService
    const profile = await this.usersService.createProfile({
      supabaseUserId: data.user.id,
      email,
      role: role || 'USER',
      ...profileData,
    });

    // Sign in to get tokens
    const { data: sessionData, error: signInError } = await this.supabaseService
      .getClient()
      .auth.signInWithPassword({
        email,
        password,
      });

    if (signInError || !sessionData.session) {
      throw new BadRequestException(
        'Compte créé mais erreur lors de la connexion',
      );
    }

    return {
      access_token: sessionData.session.access_token,
      refresh_token: sessionData.session.refresh_token,
      token_type: 'bearer',
      expires_in: sessionData.session.expires_in || 3600,
      profile: {
        id: profile.id,
        email: profile.email,
        role: profile.role as any,
        firstName: profile.firstName || undefined,
        lastName: profile.lastName || undefined,
        phone: profile.phone || undefined,
        companyName: profile.companyName || undefined,
        siret: profile.siret || undefined,
        isActive: profile.isActive,
        isVerified: profile.isVerified,
        createdAt: profile.createdAt,
        updatedAt: profile.updatedAt,
      },
    };
  }

  /**
   * Login - Authenticate user
   */
  async login(loginDto: LoginDto): Promise<AuthResponseDto> {
    const { email, password } = loginDto;

    // Sign in with Supabase
    const { data, error } = await this.supabaseService
      .getClient()
      .auth.signInWithPassword({
        email,
        password,
      });

    if (error || !data.session || !data.user) {
      throw new UnauthorizedException('Email ou mot de passe incorrect');
    }

    // Get profile
    const profile = await this.prismaService.profile.findUnique({
      where: { supabaseUserId: data.user.id },
    });

    if (!profile) {
      throw new UnauthorizedException('Profil utilisateur non trouvé');
    }

    if (!profile.isActive) {
      throw new UnauthorizedException('Votre compte a été désactivé');
    }

    return {
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
      token_type: 'bearer',
      expires_in: data.session.expires_in || 3600,
      profile: {
        id: profile.id,
        email: profile.email,
        role: profile.role as any,
        firstName: profile.firstName || undefined,
        lastName: profile.lastName || undefined,
        phone: profile.phone || undefined,
        companyName: profile.companyName || undefined,
        siret: profile.siret || undefined,
        isActive: profile.isActive,
        isVerified: profile.isVerified,
        createdAt: profile.createdAt,
        updatedAt: profile.updatedAt,
      },
    };
  }

  /**
   * Verify token and return user profile
   */
  async verifyToken(token: string): Promise<ProfileResponseDto> {
    const supabaseUser = await this.supabaseService.verifyToken(token);

    if (!supabaseUser) {
      throw new UnauthorizedException('Invalid or expired token');
    }

    const profile = await this.prismaService.profile.findUnique({
      where: { supabaseUserId: supabaseUser.id },
    });

    if (!profile) {
      throw new UnauthorizedException('User profile not found');
    }

    if (!profile.isActive) {
      throw new UnauthorizedException('User account is inactive');
    }

    return profile as ProfileResponseDto;
  }

  /**
   * Refresh token - Generate new access token
   */
  async refreshToken(refreshToken: string): Promise<RefreshTokenResponseDto> {
    const { data, error } = await this.supabaseService
      .getClient()
      .auth.refreshSession({
        refresh_token: refreshToken,
      });

    if (error || !data.session) {
      throw new UnauthorizedException('Refresh token invalide ou expiré');
    }

    return {
      access_token: data.session.access_token,
      token_type: 'bearer',
      expires_in: data.session.expires_in || 3600,
    };
  }

  /**
   * Logout - Sign out user
   */
  async logout(supabaseUserId: string): Promise<MessageResponseDto> {
    const { error } = await this.supabaseService
      .getAdminClient()
      .auth.admin.signOut(supabaseUserId);

    if (error) {
      throw new BadRequestException('Erreur lors de la déconnexion');
    }

    return { message: 'Déconnexion réussie' };
  }

  /**
   * Forgot password - Send reset email
   */
  async forgotPassword(email: string): Promise<MessageResponseDto> {
    const { error } = await this.supabaseService
      .getClient()
      .auth.resetPasswordForEmail(email, {
        redirectTo: `${process.env.FRONTEND_URL}/reset-password`,
      });

    if (error) {
      throw new BadRequestException("Erreur lors de l'envoi de l'email");
    }

    return { message: 'Email de réinitialisation envoyé' };
  }

  /**
   * Reset password - Update password with token
   */
  async resetPassword(
    token: string,
    newPassword: string,
  ): Promise<MessageResponseDto> {
    const { error } = await this.supabaseService.getClient().auth.updateUser({
      password: newPassword,
    });

    if (error) {
      throw new BadRequestException('Token invalide ou expiré');
    }

    return { message: 'Mot de passe réinitialisé avec succès' };
  }

  /**
   * Change password - Update password with old password verification
   */
  async changePassword(
    email: string,
    oldPassword: string,
    newPassword: string,
  ): Promise<MessageResponseDto> {
    // Verify old password by attempting to sign in
    const { error: signInError } = await this.supabaseService
      .getClient()
      .auth.signInWithPassword({
        email,
        password: oldPassword,
      });

    if (signInError) {
      throw new BadRequestException('Ancien mot de passe incorrect');
    }

    // Update to new password
    const { error } = await this.supabaseService.getClient().auth.updateUser({
      password: newPassword,
    });

    if (error) {
      throw new BadRequestException(
        'Erreur lors du changement de mot de passe',
      );
    }

    return { message: 'Mot de passe modifié avec succès' };
  }

  /**
   * Update email - Change user email
   */
  async updateEmail(
    supabaseUserId: string,
    newEmail: string,
    password: string,
  ): Promise<MessageResponseDto> {
    // Get current user email
    const profile = await this.prismaService.profile.findUnique({
      where: { supabaseUserId },
    });

    if (!profile) {
      throw new NotFoundException('Profil non trouvé');
    }

    // Verify password
    const { error: signInError } = await this.supabaseService
      .getClient()
      .auth.signInWithPassword({
        email: profile.email,
        password,
      });

    if (signInError) {
      throw new BadRequestException('Mot de passe incorrect');
    }

    // Update email in Supabase
    const { error } = await this.supabaseService
      .getAdminClient()
      .auth.admin.updateUserById(supabaseUserId, {
        email: newEmail,
      });

    if (error) {
      throw new BadRequestException(
        'Email déjà utilisé ou erreur lors de la mise à jour',
      );
    }

    // Update email in profile
    await this.prismaService.profile.update({
      where: { supabaseUserId },
      data: { email: newEmail },
    });

    return { message: 'Email mis à jour avec succès' };
  }

  /**
   * Resend verification email
   */
  async resendVerification(email: string): Promise<MessageResponseDto> {
    const { error } = await this.supabaseService.getClient().auth.resend({
      type: 'signup',
      email,
    });

    if (error) {
      throw new BadRequestException(
        "Erreur lors de l'envoi de l'email de vérification",
      );
    }

    return { message: 'Email de vérification envoyé' };
  }

  /**
   * Initiate OAuth - Generate OAuth URL
   */
  async initiateOAuth(
    provider: 'google' | 'github',
  ): Promise<OAuthUrlResponseDto> {
    const { data, error } = await this.supabaseService
      .getClient()
      .auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${process.env.BACKEND_URL || 'http://localhost:3000'}/api/v1/auth/oauth/callback`,
        },
      });

    if (error || !data.url) {
      throw new BadRequestException(
        "Erreur lors de la génération de l'URL OAuth",
      );
    }

    return {
      url: data.url,
      provider,
    };
  }

  /**
   * Handle OAuth callback
   */
  async handleOAuthCallback(
    code: string,
    provider: string,
  ): Promise<AuthResponseDto> {
    const { data, error } = await this.supabaseService
      .getClient()
      .auth.exchangeCodeForSession(code);

    if (error || !data.session || !data.user) {
      throw new BadRequestException('Code OAuth invalide');
    }

    // Check if profile exists
    let profile = await this.usersService.getProfileBySupabaseId(data.user.id);

    // Create profile if doesn't exist using UsersService
    if (!profile) {
      profile = await this.usersService.createProfile({
        supabaseUserId: data.user.id,
        email: data.user.email!,
        role: 'USER',
        firstName:
          data.user.user_metadata?.full_name?.split(' ')[0] || undefined,
        lastName:
          data.user.user_metadata?.full_name?.split(' ')[1] || undefined,
      });
    }

    return {
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
      token_type: 'bearer',
      expires_in: data.session.expires_in || 3600,
      profile: {
        id: profile.id,
        email: profile.email,
        role: profile.role as any,
        firstName: profile.firstName || undefined,
        lastName: profile.lastName || undefined,
        phone: profile.phone || undefined,
        companyName: profile.companyName || undefined,
        siret: profile.siret || undefined,
        isActive: profile.isActive,
        isVerified: profile.isVerified,
        createdAt: profile.createdAt,
        updatedAt: profile.updatedAt,
      },
    };
  }
}
