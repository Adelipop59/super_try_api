import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  NotFoundException,
  Logger,
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
  CompleteOnboardingDto,
} from './dto/auth.dto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private supabaseService: SupabaseService,
    private prismaService: PrismaService,
    private usersService: UsersService,
  ) {}

  /**
   * Signup - Create Supabase user and profile
   */
  async signup(signupDto: SignupDto): Promise<AuthResponseDto> {
    const { email, password, role, country, countries, ...profileData } = signupDto;

    // Security: Prevent ADMIN creation via public signup
    if (role === 'ADMIN') {
      throw new BadRequestException(
        'Cannot create ADMIN users via signup. Contact support.',
      );
    }

    // Validate required fields for PRO
    if (role === 'PRO') {
      if (!profileData.firstName || !profileData.lastName) {
        throw new BadRequestException(
          'Le prénom et le nom sont obligatoires pour un compte PRO',
        );
      }

      // Validate countries are provided and valid
      if (!countries || countries.length === 0) {
        throw new BadRequestException(
          'Au moins un pays doit être sélectionné pour un compte PRO',
        );
      }

      // Validate all countries exist
      const validCountries = await this.prismaService.country.findMany({
        where: { code: { in: countries } },
        select: { code: true, nameFr: true },
      });

      if (validCountries.length !== countries.length) {
        const validCodes = validCountries.map(c => c.code);
        const invalidCodes = countries.filter(c => !validCodes.includes(c));
        throw new BadRequestException(
          `Code(s) pays invalide(s): ${invalidCodes.join(', ')}. Utilisez GET /users/available-countries pour voir la liste.`,
        );
      }

      // Check dynamic availability using the same logic as getAvailableCountries
      const priorityCountriesEnv = process.env.PRIORITY_COUNTRIES || 'FR';
      const priorityCountries = priorityCountriesEnv.split(',').map(c => c.trim());
      const minTestersPerCountry = parseInt(process.env.MIN_TESTERS_PER_COUNTRY || '10', 10);

      // Count testers for each selected country
      const testerCounts = await this.prismaService.profile.groupBy({
        by: ['country'],
        where: {
          role: 'USER',
          country: { in: countries },
        },
        _count: {
          country: true,
        },
      });

      const testerCountMap = new Map<string, number>();
      testerCounts.forEach(item => {
        if (item.country) {
          testerCountMap.set(item.country, item._count.country);
        }
      });

      // Check if at least one country is available
      const availableCountries = countries.filter(code => {
        const isPriority = priorityCountries.includes(code);
        const testerCount = testerCountMap.get(code) || 0;
        return isPriority || testerCount >= minTestersPerCountry;
      });

      if (availableCountries.length === 0) {
        throw new BadRequestException(
          'Aucun des pays sélectionnés n\'est disponible. Au moins un pays doit avoir le statut "Disponible"',
        );
      }
    }

    // Validate country for USER (required but any country allowed)
    if (!role || role === 'USER') {
      if (!country) {
        throw new BadRequestException(
          'Le code pays est obligatoire pour un compte testeur',
        );
      }

      // Validate country exists
      const countryData = await this.prismaService.country.findUnique({
        where: { code: country },
      });

      if (!countryData) {
        throw new BadRequestException(
          `Le code pays "${country}" n'est pas valide. Utilisez GET /users/available-countries pour voir la liste.`,
        );
      }

      // No availability check for USER - they can register from any country
    }

    // Security check: verify if email already exists in our database
    const existingProfile = await this.prismaService.profile.findUnique({
      where: { email },
    });

    if (existingProfile) {
      throw new BadRequestException(
        `Un compte existe déjà avec cet email. Veuillez vous connecter ou utiliser un autre email.`,
      );
    }

    // Create user in Supabase with email already confirmed
    const { data, error } = await this.supabaseService
      .getAdminClient()
      .auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          role: role || 'USER',
        },
      });

    if (error || !data.user) {
      // Handle specific Supabase errors
      if (error?.message?.includes('already registered')) {
        throw new BadRequestException(
          'Un compte existe déjà avec cet email dans le système d\'authentification.',
        );
      }
      throw new BadRequestException(
        error?.message || 'Erreur lors de la création du compte',
      );
    }

    // Create profile in database using UsersService
    // Only allow USER or PRO roles
    const profile = await this.usersService.createProfile({
      supabaseUserId: data.user.id,
      email,
      role: role || 'USER',
      country,
      firstName: profileData.firstName || '',
      lastName: profileData.lastName || '',
      phone: profileData.phone,
      companyName: profileData.companyName,
      siret: profileData.siret,
    });

    // Create ProfileCountry entries for PRO
    if (role === 'PRO' && countries) {
      await this.prismaService.profileCountry.createMany({
        data: countries.map(countryCode => ({
          profileId: profile.id,
          countryCode,
        })),
      });
    }

    // Send email verification
    const { error: emailError } = await this.supabaseService
      .getClient()
      .auth.resend({
        type: 'signup',
        email,
      });

    if (emailError) {
      this.logger.warn(`Failed to send verification email to ${email}:`, emailError.message);
    }

    // Auto-login user after signup
    const { data: sessionData, error: signInError } = await this.supabaseService
      .getClient()
      .auth.signInWithPassword({
        email,
        password,
      });

    if (signInError || !sessionData.session) {
      this.logger.error(`Failed to auto-login user ${email}:`, signInError?.message);
      // Return without tokens if auto-login fails
      return {
        access_token: '',
        refresh_token: '',
        token_type: 'bearer',
        expires_in: 0,
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

    // Return response with tokens - user is auto-logged in
    this.logger.log(`User ${email} created and logged in successfully.`);

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
      this.logger.error(`Login failed for ${email}:`, error?.message);

      // Check if error is due to unconfirmed email
      if (error?.message === 'Email not confirmed') {
        throw new UnauthorizedException('Veuillez confirmer votre email avant de vous connecter');
      }

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
    // Note: Supabase doesn't require server-side session invalidation
    // Cookies are cleared by the controller, which effectively logs out the user
    // The JWT tokens will expire naturally based on their TTL

    // Optional: You could invalidate all sessions for this user with:
    // await this.supabaseService.getAdminClient().auth.admin.signOut(supabaseUserId, 'global');
    // But this is not necessary for basic logout functionality

    this.logger.log(`User ${supabaseUserId} logged out successfully`);
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
    _token: string,
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
    // Check if user exists and get email confirmation status
    const { data: userData, error: userError } = await this.supabaseService
      .getAdminClient()
      .auth.admin.listUsers();

    if (userError) {
      this.logger.warn(`Failed to check user status for ${email}: ${userError.message}`);
    }

    // Find user by email
    const user = userData?.users?.find((u: any) => u.email === email);

    if (!user) {
      throw new BadRequestException('Aucun compte trouvé avec cet email.');
    }

    // Check if email is already confirmed
    if (user.email_confirmed_at) {
      throw new BadRequestException('Cet email est déjà vérifié. Vous pouvez vous connecter.');
    }

    // Send verification email
    const { error } = await this.supabaseService.getClient().auth.resend({
      type: 'signup',
      email,
    });

    if (error) {
      this.logger.warn(`Failed to resend verification email to ${email}: ${error.message}`);

      if (error.message.includes('rate limit') || error.message.includes('too many requests')) {
        throw new BadRequestException('Trop de demandes. Veuillez réessayer dans quelques minutes.');
      }

      throw new BadRequestException(
        `Erreur lors de l'envoi de l'email de vérification: ${error.message}`,
      );
    }

    return { message: 'Email de vérification envoyé avec succès. Consultez votre boîte mail.' };
  }

  /**
   * Initiate OAuth - Generate OAuth URL
   * Supports: google, github, microsoft (azure)
   */
  async initiateOAuth(
    provider: 'google' | 'github' | 'microsoft' | 'azure',
  ): Promise<OAuthUrlResponseDto> {
    // Supabase uses 'azure' for Microsoft OAuth
    const supabaseProvider = provider === 'microsoft' ? 'azure' : provider;

    // Redirect to frontend instead of backend for localhost compatibility
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3001';

    const { data, error } = await this.supabaseService
      .getClient()
      .auth.signInWithOAuth({
        provider: supabaseProvider as any,
        options: {
          redirectTo: `${frontendUrl}/auth/callback`,
          scopes: 'email openid profile',
        },
      });

    if (error || !data.url) {
      throw new BadRequestException(
        `OAuth initialization failed: ${error?.message || 'Unknown error'}`,
      );
    }

    return {
      url: data.url,
      provider,
    };
  }

  /**
   * Check if email exists
   */
  async checkEmailExists(email: string): Promise<{ exists: boolean; email: string; role?: any }> {
    const profile = await this.prismaService.profile.findUnique({
      where: { email },
      select: { id: true, role: true },
    });

    return {
      exists: !!profile,
      email,
      role: profile?.role,
    };
  }

  /**
   * Handle OAuth callback
   */
  async handleOAuthCallback(
    code: string,
    _provider: string,
  ): Promise<AuthResponseDto> {
    const { data, error } = await this.supabaseService
      .getClient()
      .auth.exchangeCodeForSession(code);

    if (error || !data.session || !data.user) {
      throw new BadRequestException('Code OAuth invalide');
    }

    // Check if profile exists with this Supabase user ID
    let profile = await this.usersService.getProfileBySupabaseId(data.user.id);

    // If no profile found with this Supabase ID, check if email already exists
    if (!profile) {
      // Security check: verify if email is already registered with a different auth method
      const existingProfile = await this.prismaService.profile.findUnique({
        where: { email: data.user.email },
      });

      if (existingProfile) {
        // Email already exists with a different authentication method
        // Link accounts by updating the existing profile with the new Supabase ID
        this.logger.log(
          `Linking OAuth account for existing user: ${data.user.email}`,
        );

        await this.prismaService.profile.update({
          where: { id: existingProfile.id },
          data: {
            supabaseUserId: data.user.id,
            authProvider: this.getProviderFromUserMetadata(data.user),
          },
        });
        profile = existingProfile;
      } else {
        // Create new profile if email doesn't exist - minimal profile for OAuth users
        // User will need to complete onboarding to fill in role, country, etc.
        const authProvider = this.getProviderFromUserMetadata(data.user);

        profile = await this.usersService.createProfile({
          supabaseUserId: data.user.id,
          email: data.user.email!,
          role: null, // No default role - user must choose during onboarding
          firstName:
            data.user.user_metadata?.full_name?.split(' ')[0] || undefined,
          lastName:
            data.user.user_metadata?.full_name?.split(' ')[1] || undefined,
          authProvider,
          isOnboarded: false, // OAuth users need to complete onboarding
        });
      }
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
   * Complete onboarding - Finalize OAuth user profile
   */
  async completeOnboarding(
    supabaseUserId: string,
    onboardingDto: CompleteOnboardingDto,
  ): Promise<ProfileResponseDto> {
    const { role, country, countries, ...profileData } = onboardingDto;

    // Get existing profile
    const profile = await this.prismaService.profile.findUnique({
      where: { supabaseUserId },
    });

    if (!profile) {
      throw new NotFoundException('Profil non trouvé');
    }

    if (profile.isOnboarded) {
      throw new BadRequestException('Le profil est déjà complété');
    }

    // Validate role is provided
    if (!role || !['USER', 'PRO'].includes(role)) {
      throw new BadRequestException(
        'Le rôle est obligatoire et doit être USER ou PRO',
      );
    }

    // Security: Prevent ADMIN creation
    if (role === 'ADMIN') {
      throw new BadRequestException(
        'Cannot set ADMIN role. Contact support.',
      );
    }

    // Validate required fields for PRO
    if (role === 'PRO') {
      if (!profileData.firstName || !profileData.lastName) {
        throw new BadRequestException(
          'Le prénom et le nom sont obligatoires pour un compte PRO',
        );
      }

      // Validate countries are provided and valid
      if (!countries || countries.length === 0) {
        throw new BadRequestException(
          'Au moins un pays doit être sélectionné pour un compte PRO',
        );
      }

      // Validate all countries exist
      const validCountries = await this.prismaService.country.findMany({
        where: { code: { in: countries } },
        select: { code: true, nameFr: true },
      });

      if (validCountries.length !== countries.length) {
        const validCodes = validCountries.map(c => c.code);
        const invalidCodes = countries.filter(c => !validCodes.includes(c));
        throw new BadRequestException(
          `Code(s) pays invalide(s): ${invalidCodes.join(', ')}. Utilisez GET /users/available-countries pour voir la liste.`,
        );
      }

      // Check dynamic availability
      const priorityCountriesEnv = process.env.PRIORITY_COUNTRIES || 'FR';
      const priorityCountries = priorityCountriesEnv.split(',').map(c => c.trim());
      const minTestersPerCountry = parseInt(process.env.MIN_TESTERS_PER_COUNTRY || '10', 10);

      const testerCounts = await this.prismaService.profile.groupBy({
        by: ['country'],
        where: {
          role: 'USER',
          country: { in: countries },
        },
        _count: {
          country: true,
        },
      });

      const testerCountMap = new Map<string, number>();
      testerCounts.forEach(item => {
        if (item.country) {
          testerCountMap.set(item.country, item._count.country);
        }
      });

      const availableCountries = countries.filter(code => {
        const isPriority = priorityCountries.includes(code);
        const testerCount = testerCountMap.get(code) || 0;
        return isPriority || testerCount >= minTestersPerCountry;
      });

      if (availableCountries.length === 0) {
        throw new BadRequestException(
          'Aucun des pays sélectionnés n\'est disponible. Au moins un pays doit avoir le statut "Disponible"',
        );
      }
    }

    // Validate country for USER
    if (role === 'USER') {
      if (!country) {
        throw new BadRequestException(
          'Le code pays est obligatoire pour un compte testeur',
        );
      }

      // Validate country exists
      const countryData = await this.prismaService.country.findUnique({
        where: { code: country },
      });

      if (!countryData) {
        throw new BadRequestException(
          `Le code pays "${country}" n'est pas valide. Utilisez GET /users/available-countries pour voir la liste.`,
        );
      }
    }

    // Update profile with onboarding data
    const updatedProfile = await this.prismaService.profile.update({
      where: { supabaseUserId },
      data: {
        role,
        country,
        firstName: profileData.firstName || profile.firstName,
        lastName: profileData.lastName || profile.lastName,
        phone: profileData.phone,
        companyName: profileData.companyName,
        siret: profileData.siret,
        isOnboarded: true,
      },
    });

    // Create ProfileCountry entries for PRO
    if (role === 'PRO' && countries) {
      await this.prismaService.profileCountry.createMany({
        data: countries.map(countryCode => ({
          profileId: updatedProfile.id,
          countryCode,
        })),
      });
    }

    // Create wallet for USER
    if (role === 'USER') {
      await this.prismaService.wallet.create({
        data: {
          userId: updatedProfile.id,
        },
      });
    }

    this.logger.log(`User ${updatedProfile.email} completed onboarding as ${role}`);

    return updatedProfile as ProfileResponseDto;
  }

  /**
   * Get provider name from user metadata
   */
  private getProviderFromUserMetadata(user: any): string | undefined {
    // Supabase stores the provider in app_metadata or identities
    if (user.app_metadata?.provider) {
      return user.app_metadata.provider;
    }
    if (user.identities && user.identities.length > 0) {
      return user.identities[0].provider;
    }
    return undefined;
  }
}
