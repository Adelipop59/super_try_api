import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient, User } from '@supabase/supabase-js';

@Injectable()
export class SupabaseService {
  private supabase: SupabaseClient;
  private supabaseAdmin: SupabaseClient;

  constructor(private configService: ConfigService) {
    const supabaseUrl = this.configService.get<string>('supabase.url');
    const supabaseKey = this.configService.get<string>('supabase.key');
    const supabaseServiceKey = this.configService.get<string>(
      'supabase.serviceKey',
    );

    if (!supabaseUrl || !supabaseKey || !supabaseServiceKey) {
      throw new Error('Supabase configuration is missing');
    }

    // Client for regular operations (respects RLS)
    this.supabase = createClient(supabaseUrl, supabaseKey);

    // Admin client with service role (bypasses RLS)
    this.supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
  }

  /**
   * Get Supabase client (respects Row Level Security)
   */
  getClient(): SupabaseClient {
    return this.supabase;
  }

  /**
   * Get Supabase admin client (bypasses Row Level Security)
   * Use with caution - for admin operations only
   */
  getAdminClient(): SupabaseClient {
    return this.supabaseAdmin;
  }

  /**
   * Verify JWT token and get user information
   */
  async verifyToken(token: string): Promise<User | null> {
    try {
      const { data, error } = await this.supabaseAdmin.auth.getUser(token);

      if (error || !data.user) {
        return null;
      }

      return data.user;
    } catch (error) {
      console.error('Token verification error:', error);
      return null;
    }
  }

  /**
   * Get user by ID using admin client
   */
  async getUserById(userId: string): Promise<User | null> {
    try {
      const { data, error } =
        await this.supabaseAdmin.auth.admin.getUserById(userId);

      if (error || !data.user) {
        return null;
      }

      return data.user;
    } catch (error) {
      console.error('Get user by ID error:', error);
      return null;
    }
  }
}
