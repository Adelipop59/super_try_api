import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { CreateProfileDto } from './dto/create-profile.dto';
import { Profile, UserRole } from '@prisma/client';
import {
  PaginatedResponse,
  createPaginatedResponse,
  calculateOffset,
} from '../../common/dto/pagination.dto';

@Injectable()
export class UsersService {
  constructor(private prismaService: PrismaService) {}

  /**
   * Create a new profile
   * Used by Auth module during signup and OAuth
   */
  async createProfile(createProfileDto: CreateProfileDto): Promise<Profile> {
    // Check if profile already exists
    const existingProfile = await this.getProfileBySupabaseId(
      createProfileDto.supabaseUserId,
    );

    if (existingProfile) {
      throw new BadRequestException('Profile already exists for this user');
    }

    // Check if email is already used
    const emailExists = await this.getProfileByEmail(createProfileDto.email);
    if (emailExists) {
      throw new BadRequestException('Email already in use');
    }

    return this.prismaService.profile.create({
      data: {
        supabaseUserId: createProfileDto.supabaseUserId,
        email: createProfileDto.email,
        role: createProfileDto.role || UserRole.USER,
        firstName: createProfileDto.firstName,
        lastName: createProfileDto.lastName,
        phone: createProfileDto.phone,
        avatar: createProfileDto.avatar,
        companyName: createProfileDto.companyName,
        siret: createProfileDto.siret,
      },
    });
  }

  /**
   * Get all profiles with pagination (admin only)
   */
  async getAllProfiles(filters?: {
    role?: string;
    isActive?: boolean;
    isVerified?: boolean;
    page?: number;
    limit?: number;
  }): Promise<PaginatedResponse<Profile>> {
    const page = filters?.page || 1;
    const limit = filters?.limit || 20;
    const offset = calculateOffset(page, limit);

    const where = {
      ...(filters?.role && { role: filters.role as any }),
      ...(filters?.isActive !== undefined && { isActive: filters.isActive }),
      ...(filters?.isVerified !== undefined && {
        isVerified: filters.isVerified,
      }),
    };

    const [profiles, total] = await Promise.all([
      this.prismaService.profile.findMany({
        where,
        orderBy: {
          createdAt: 'desc',
        },
        take: limit,
        skip: offset,
      }),
      this.prismaService.profile.count({ where }),
    ]);

    return createPaginatedResponse(profiles, total, page, limit);
  }

  /**
   * Get profile by ID
   */
  async getProfileById(id: string): Promise<Profile> {
    const profile = await this.prismaService.profile.findUnique({
      where: { id },
    });

    if (!profile) {
      throw new NotFoundException(`Profile with ID ${id} not found`);
    }

    return profile;
  }

  /**
   * Get profile by Supabase user ID
   */
  async getProfileBySupabaseId(
    supabaseUserId: string,
  ): Promise<Profile | null> {
    return this.prismaService.profile.findUnique({
      where: { supabaseUserId },
    });
  }

  /**
   * Get profile by email
   */
  async getProfileByEmail(email: string): Promise<Profile | null> {
    return this.prismaService.profile.findUnique({
      where: { email },
    });
  }

  /**
   * Update profile
   */
  async updateProfile(
    id: string,
    updateProfileDto: UpdateProfileDto,
  ): Promise<Profile> {
    const profile = await this.getProfileById(id);

    if (!profile) {
      throw new NotFoundException(`Profile with ID ${id} not found`);
    }

    return this.prismaService.profile.update({
      where: { id },
      data: updateProfileDto,
    });
  }

  /**
   * Delete profile (soft delete by setting isActive to false)
   */
  async deleteProfile(id: string): Promise<Profile> {
    const profile = await this.getProfileById(id);

    if (!profile) {
      throw new NotFoundException(`Profile with ID ${id} not found`);
    }

    return this.prismaService.profile.update({
      where: { id },
      data: { isActive: false },
    });
  }

  /**
   * Verify user profile
   */
  async verifyProfile(id: string): Promise<Profile> {
    const profile = await this.getProfileById(id);

    if (!profile) {
      throw new NotFoundException(`Profile with ID ${id} not found`);
    }

    if (profile.isVerified) {
      throw new BadRequestException('Profile is already verified');
    }

    return this.prismaService.profile.update({
      where: { id },
      data: { isVerified: true },
    });
  }

  /**
   * Change user role (admin only)
   */
  async changeRole(
    id: string,
    newRole: 'USER' | 'PRO' | 'ADMIN',
  ): Promise<Profile> {
    const profile = await this.getProfileById(id);

    if (!profile) {
      throw new NotFoundException(`Profile with ID ${id} not found`);
    }

    return this.prismaService.profile.update({
      where: { id },
      data: { role: newRole },
    });
  }
}
