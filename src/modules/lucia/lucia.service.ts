import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Lucia, Session, User } from 'lucia';
import { PrismaAdapter } from '@lucia-auth/adapter-prisma';
import { PrismaClient } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { Google, GitHub, AzureAD } from 'arctic';
import * as argon2 from '@node-rs/argon2';

export interface DatabaseUserAttributes {
  id: string;
  email: string;
  role: string | null;
  firstName: string | null;
  lastName: string | null;
  isOnboarded: boolean;
  isActive: boolean;
  authProvider: string | null;
}

@Injectable()
export class LuciaService implements OnModuleInit {
  private lucia: Lucia;
  public google: Google;
  public github: GitHub;
  public azure: AzureAD;

  constructor(
    private prismaService: PrismaService,
    private configService: ConfigService,
  ) {}

  onModuleInit() {
    // Initialize Lucia adapter with Prisma
    const adapter = new PrismaAdapter(
      this.prismaService as unknown as PrismaClient,
      this.prismaService.session as any,
      this.prismaService.profile as any,
    );

    // Initialize Lucia
    this.lucia = new Lucia(adapter, {
      sessionCookie: {
        expires: false, // Session cookies that last until browser close
        attributes: {
          secure: this.configService.get('NODE_ENV') === 'production',
        },
      },
      getUserAttributes: (attributes) => {
        return {
          id: attributes.id,
          email: attributes.email,
          role: attributes.role,
          firstName: attributes.firstName,
          lastName: attributes.lastName,
          isOnboarded: attributes.isOnboarded,
          isActive: attributes.isActive,
          authProvider: attributes.authProvider,
        };
      },
    });

    // Initialize OAuth providers
    const frontendUrl = this.configService.get<string>('FRONTEND_URL');

    // Google OAuth
    const googleClientId = this.configService.get<string>(
      'GOOGLE_CLIENT_ID',
      '',
    );
    const googleClientSecret = this.configService.get<string>(
      'GOOGLE_CLIENT_SECRET',
      '',
    );
    if (googleClientId && googleClientSecret) {
      this.google = new Google(
        googleClientId,
        googleClientSecret,
        `${frontendUrl}/auth/callback/google`,
      );
    }

    // GitHub OAuth
    const githubClientId = this.configService.get<string>(
      'GITHUB_CLIENT_ID',
      '',
    );
    const githubClientSecret = this.configService.get<string>(
      'GITHUB_CLIENT_SECRET',
      '',
    );
    if (githubClientId && githubClientSecret) {
      this.github = new GitHub(githubClientId, githubClientSecret, {
        redirectURI: `${frontendUrl}/auth/callback/github`,
      });
    }

    // Azure AD (Microsoft) OAuth
    const azureTenantId = this.configService.get<string>('AZURE_TENANT_ID', '');
    const azureClientId = this.configService.get<string>(
      'AZURE_CLIENT_ID',
      '',
    );
    const azureClientSecret = this.configService.get<string>(
      'AZURE_CLIENT_SECRET',
      '',
    );
    if (azureTenantId && azureClientId && azureClientSecret) {
      this.azure = new AzureAD(
        azureTenantId,
        azureClientId,
        azureClientSecret,
        `${frontendUrl}/auth/callback/azure`,
      );
    }
  }

  /**
   * Get Lucia instance
   */
  getLucia(): Lucia {
    return this.lucia;
  }

  /**
   * Create a new session for a user
   */
  async createSession(userId: string): Promise<Session> {
    return this.lucia.createSession(userId, {});
  }

  /**
   * Validate a session by ID
   */
  async validateSession(
    sessionId: string,
  ): Promise<{ user: User; session: Session } | { user: null; session: null }> {
    return this.lucia.validateSession(sessionId);
  }

  /**
   * Invalidate a session
   */
  async invalidateSession(sessionId: string): Promise<void> {
    return this.lucia.invalidateSession(sessionId);
  }

  /**
   * Invalidate all sessions for a user
   */
  async invalidateUserSessions(userId: string): Promise<void> {
    return this.lucia.invalidateUserSessions(userId);
  }

  /**
   * Create a session cookie
   */
  createSessionCookie(sessionId: string): {
    name: string;
    value: string;
    attributes: Record<string, any>;
  } {
    return this.lucia.createSessionCookie(sessionId);
  }

  /**
   * Create a blank session cookie (for logout)
   */
  createBlankSessionCookie(): {
    name: string;
    value: string;
    attributes: Record<string, any>;
  } {
    return this.lucia.createBlankSessionCookie();
  }

  /**
   * Hash a password using Argon2
   */
  async hashPassword(password: string): Promise<string> {
    return argon2.hash(password, {
      memoryCost: 19456,
      timeCost: 2,
      outputLen: 32,
      parallelism: 1,
    });
  }

  /**
   * Verify a password against a hash
   */
  async verifyPassword(hash: string, password: string): Promise<boolean> {
    try {
      return await argon2.verify(hash, password);
    } catch {
      return false;
    }
  }

  /**
   * Generate OAuth authorization URL for Google
   */
  async createGoogleAuthorizationURL(state: string): Promise<URL> {
    if (!this.google) {
      throw new Error('Google OAuth is not configured');
    }
    return await this.google.createAuthorizationURL(state, {
      scopes: ['email', 'profile'],
    });
  }

  /**
   * Generate OAuth authorization URL for GitHub
   */
  async createGitHubAuthorizationURL(state: string): Promise<URL> {
    if (!this.github) {
      throw new Error('GitHub OAuth is not configured');
    }
    return await this.github.createAuthorizationURL(state, {
      scopes: ['user:email'],
    });
  }

  /**
   * Generate OAuth authorization URL for Azure AD
   */
  async createAzureAuthorizationURL(state: string): Promise<URL> {
    if (!this.azure) {
      throw new Error('Azure OAuth is not configured');
    }
    return await this.azure.createAuthorizationURL(state, {
      scopes: ['openid', 'profile', 'email'],
    });
  }

  /**
   * Validate Google OAuth callback code
   */
  async validateGoogleAuthorizationCode(code: string): Promise<{
    accessToken: string;
    refreshToken?: string;
    accessTokenExpiresAt: Date;
  }> {
    if (!this.google) {
      throw new Error('Google OAuth is not configured');
    }
    return await this.google.validateAuthorizationCode(code);
  }

  /**
   * Validate GitHub OAuth callback code
   */
  async validateGitHubAuthorizationCode(code: string): Promise<{
    accessToken: string;
  }> {
    if (!this.github) {
      throw new Error('GitHub OAuth is not configured');
    }
    return await this.github.validateAuthorizationCode(code);
  }

  /**
   * Validate Azure AD OAuth callback code
   */
  async validateAzureAuthorizationCode(code: string): Promise<{
    accessToken: string;
    refreshToken?: string;
    accessTokenExpiresAt: Date;
  }> {
    if (!this.azure) {
      throw new Error('Azure OAuth is not configured');
    }
    return await this.azure.validateAuthorizationCode(code);
  }

  /**
   * Fetch Google user info
   */
  async fetchGoogleUser(accessToken: string): Promise<{
    sub: string;
    email: string;
    email_verified: boolean;
    name: string;
    given_name?: string;
    family_name?: string;
    picture?: string;
  }> {
    const response = await fetch(
      'https://www.googleapis.com/oauth2/v3/userinfo',
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );

    if (!response.ok) {
      throw new Error('Failed to fetch Google user info');
    }

    return response.json();
  }

  /**
   * Fetch GitHub user info
   */
  async fetchGitHubUser(accessToken: string): Promise<{
    id: number;
    login: string;
    email: string | null;
    name: string | null;
    avatar_url: string;
  }> {
    const response = await fetch('https://api.github.com/user', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'User-Agent': 'SuperTry-API',
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch GitHub user info');
    }

    const user = await response.json();

    // If email is null, fetch primary email from emails endpoint
    if (!user.email) {
      const emailsResponse = await fetch('https://api.github.com/user/emails', {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'User-Agent': 'SuperTry-API',
        },
      });

      if (emailsResponse.ok) {
        const emails = await emailsResponse.json();
        const primaryEmail = emails.find(
          (e: any) => e.primary && e.verified,
        )?.email;
        user.email = primaryEmail || null;
      }
    }

    return user;
  }

  /**
   * Fetch Azure AD user info
   */
  async fetchAzureUser(accessToken: string): Promise<{
    sub: string;
    email: string;
    name: string;
    given_name?: string;
    family_name?: string;
  }> {
    const response = await fetch('https://graph.microsoft.com/v1.0/me', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch Azure AD user info');
    }

    const user = await response.json();

    return {
      sub: user.id,
      email: user.mail || user.userPrincipalName,
      name: user.displayName,
      given_name: user.givenName,
      family_name: user.surname,
    };
  }
}
