import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { CategoryFilterDto } from './dto/category-filter.dto';
import { CategoryResponseDto } from './dto/category-response.dto';

@Injectable()
export class CategoriesService {
  constructor(private prismaService: PrismaService) {}

  /**
   * Generate URL-friendly slug from name
   */
  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .normalize('NFD') // Normalize accented characters
      .replace(/[\u0300-\u036f]/g, '') // Remove accents
      .replace(/[^a-z0-9\s-]/g, '') // Remove special chars
      .trim()
      .replace(/\s+/g, '-') // Replace spaces with hyphens
      .replace(/-+/g, '-'); // Remove consecutive hyphens
  }

  /**
   * Create a new category
   */
  async create(
    createCategoryDto: CreateCategoryDto,
  ): Promise<CategoryResponseDto> {
    const { name, slug, description, icon } = createCategoryDto;

    // Generate slug if not provided
    const finalSlug = slug || this.generateSlug(name);

    // Check if name or slug already exists
    const existing = await this.prismaService.category.findFirst({
      where: {
        OR: [{ name }, { slug: finalSlug }],
      },
    });

    if (existing) {
      if (existing.name === name) {
        throw new ConflictException(
          `Category with name "${name}" already exists`,
        );
      }
      throw new ConflictException(
        `Category with slug "${finalSlug}" already exists`,
      );
    }

    const category = await this.prismaService.category.create({
      data: {
        name,
        slug: finalSlug,
        description,
        icon,
      },
    });

    return this.formatResponse(category);
  }

  /**
   * Find all categories with optional filters
   */
  async findAll(filters: CategoryFilterDto): Promise<CategoryResponseDto[]> {
    const { isActive } = filters;

    const where: any = {};
    if (isActive !== undefined) {
      where.isActive = isActive;
    }

    const categories = await this.prismaService.category.findMany({
      where,
      include: {
        _count: {
          select: {
            products: true,
          },
        },
      },
      orderBy: {
        name: 'asc',
      },
    });

    return categories.map((cat) =>
      this.formatResponse(cat, cat._count.products),
    );
  }

  /**
   * Find category by ID
   */
  async findOne(id: string): Promise<CategoryResponseDto> {
    const category = await this.prismaService.category.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            products: true,
          },
        },
      },
    });

    if (!category) {
      throw new NotFoundException(`Category with ID ${id} not found`);
    }

    return this.formatResponse(category, category._count.products);
  }

  /**
   * Find category by slug
   */
  async findBySlug(slug: string): Promise<CategoryResponseDto> {
    const category = await this.prismaService.category.findUnique({
      where: { slug },
      include: {
        _count: {
          select: {
            products: true,
          },
        },
      },
    });

    if (!category) {
      throw new NotFoundException(`Category with slug "${slug}" not found`);
    }

    return this.formatResponse(category, category._count.products);
  }

  /**
   * Update category
   */
  async update(
    id: string,
    updateCategoryDto: UpdateCategoryDto,
  ): Promise<CategoryResponseDto> {
    const category = await this.prismaService.category.findUnique({
      where: { id },
    });

    if (!category) {
      throw new NotFoundException(`Category with ID ${id} not found`);
    }

    const { name, slug, description, icon } = updateCategoryDto;

    // If name is being updated, regenerate slug if not provided
    let finalSlug = slug;
    if (name && !slug) {
      finalSlug = this.generateSlug(name);
    }

    // Check for conflicts
    if (name || finalSlug) {
      const existing = await this.prismaService.category.findFirst({
        where: {
          id: { not: id },
          OR: [
            name ? { name } : {},
            finalSlug ? { slug: finalSlug } : {},
          ].filter((obj) => Object.keys(obj).length > 0),
        },
      });

      if (existing) {
        if (existing.name === name) {
          throw new ConflictException(
            `Category with name "${name}" already exists`,
          );
        }
        throw new ConflictException(
          `Category with slug "${finalSlug}" already exists`,
        );
      }
    }

    const updated = await this.prismaService.category.update({
      where: { id },
      data: {
        name,
        slug: finalSlug,
        description,
        icon,
      },
    });

    return this.formatResponse(updated);
  }

  /**
   * Toggle category active status
   */
  async toggleActive(id: string): Promise<CategoryResponseDto> {
    const category = await this.prismaService.category.findUnique({
      where: { id },
    });

    if (!category) {
      throw new NotFoundException(`Category with ID ${id} not found`);
    }

    const updated = await this.prismaService.category.update({
      where: { id },
      data: { isActive: !category.isActive },
    });

    return this.formatResponse(updated);
  }

  /**
   * Delete category (soft delete by deactivating)
   */
  async remove(id: string): Promise<{ message: string }> {
    const category = await this.prismaService.category.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            products: true,
          },
        },
      },
    });

    if (!category) {
      throw new NotFoundException(`Category with ID ${id} not found`);
    }

    // Check if category has products
    if (category._count.products > 0) {
      throw new BadRequestException(
        `Cannot delete category "${category.name}" because it has ${category._count.products} products. Please reassign or delete the products first.`,
      );
    }

    // Hard delete if no products
    await this.prismaService.category.delete({
      where: { id },
    });

    return { message: 'Category deleted successfully' };
  }

  /**
   * Format category response
   */
  private formatResponse(
    category: any,
    productCount?: number,
  ): CategoryResponseDto {
    return {
      id: category.id,
      name: category.name,
      slug: category.slug,
      description: category.description,
      icon: category.icon,
      isActive: category.isActive,
      productCount,
      createdAt: category.createdAt,
      updatedAt: category.updatedAt,
    };
  }
}
