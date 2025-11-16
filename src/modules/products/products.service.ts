import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ProductFilterDto } from './dto/product-filter.dto';
import { ProductResponseDto } from './dto/product-response.dto';
import { Prisma } from '@prisma/client';

// Type for product with all includes
type ProductWithIncludes = Prisma.ProductGetPayload<{
  include: {
    seller: true;
  };
}>;

@Injectable()
export class ProductsService {
  constructor(private prismaService: PrismaService) {}

  /**
   * Create a new product in the catalog.
   * Note: Financial details (price, shipping, rewards) are defined per campaign via the Offer model.
   */
  async create(
    sellerId: string,
    createProductDto: CreateProductDto,
  ): Promise<ProductResponseDto> {
    const product = await this.prismaService.product.create({
      data: {
        ...createProductDto,
        sellerId,
      },
      include: {
        seller: {
          select: {
            id: true,
            email: true,
            companyName: true,
          },
        },
      },
    });

    return this.formatProductResponse(product);
  }

  /**
   * Find all products with filters
   */
  async findAll(filters: ProductFilterDto): Promise<ProductResponseDto[]> {
    const { sellerId, category, isActive } = filters;

    const where: any = {};

    if (sellerId) where.sellerId = sellerId;
    if (category) where.category = category;
    if (isActive !== undefined) where.isActive = isActive;

    const products = await this.prismaService.product.findMany({
      where,
      include: {
        seller: {
          select: {
            id: true,
            email: true,
            companyName: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return products.map((product) => this.formatProductResponse(product));
  }

  /**
   * Find active products only (public endpoint)
   */
  async findAllActive(
    filters: ProductFilterDto,
  ): Promise<ProductResponseDto[]> {
    return this.findAll({ ...filters, isActive: true });
  }

  /**
   * Find product by ID
   */
  async findOne(id: string): Promise<ProductResponseDto> {
    const product = await this.prismaService.product.findUnique({
      where: { id },
      include: {
        seller: {
          select: {
            id: true,
            email: true,
            companyName: true,
          },
        },
      },
    });

    if (!product) {
      throw new NotFoundException(`Product with ID ${id} not found`);
    }

    return this.formatProductResponse(product);
  }

  /**
   * Find products by seller ID
   */
  async findBySeller(sellerId: string): Promise<ProductResponseDto[]> {
    const products = await this.prismaService.product.findMany({
      where: { sellerId },
      include: {
        seller: {
          select: {
            id: true,
            email: true,
            companyName: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return products.map((product) => this.formatProductResponse(product));
  }

  /**
   * Update product
   */
  async update(
    id: string,
    sellerId: string,
    updateProductDto: UpdateProductDto,
    isAdmin: boolean = false,
  ): Promise<ProductResponseDto> {
    // Check if product exists and belongs to seller (unless admin)
    const product = await this.prismaService.product.findUnique({
      where: { id },
    });

    if (!product) {
      throw new NotFoundException(`Product with ID ${id} not found`);
    }

    if (!isAdmin && product.sellerId !== sellerId) {
      throw new ForbiddenException('You can only update your own products');
    }

    const updatedProduct = await this.prismaService.product.update({
      where: { id },
      data: updateProductDto,
      include: {
        seller: {
          select: {
            id: true,
            email: true,
            companyName: true,
          },
        },
      },
    });

    return this.formatProductResponse(updatedProduct);
  }

  /**
   * Delete product (soft delete by setting isActive to false)
   */
  async remove(
    id: string,
    sellerId: string,
    isAdmin: boolean = false,
  ): Promise<{ message: string }> {
    const product = await this.prismaService.product.findUnique({
      where: { id },
    });

    if (!product) {
      throw new NotFoundException(`Product with ID ${id} not found`);
    }

    if (!isAdmin && product.sellerId !== sellerId) {
      throw new ForbiddenException('You can only delete your own products');
    }

    await this.prismaService.product.update({
      where: { id },
      data: { isActive: false },
    });

    return { message: 'Product deactivated successfully' };
  }

  /**
   * Toggle product active status (admin only)
   */
  async toggleActive(id: string): Promise<ProductResponseDto> {
    const product = await this.prismaService.product.findUnique({
      where: { id },
    });

    if (!product) {
      throw new NotFoundException(`Product with ID ${id} not found`);
    }

    const updatedProduct = await this.prismaService.product.update({
      where: { id },
      data: { isActive: !product.isActive },
      include: {
        seller: {
          select: {
            id: true,
            email: true,
            companyName: true,
          },
        },
      },
    });

    return this.formatProductResponse(updatedProduct);
  }

  /**
   * Format product response
   */
  private formatProductResponse(
    product: ProductWithIncludes,
  ): ProductResponseDto {
    return {
      id: product.id,
      sellerId: product.sellerId,
      seller: product.seller,
      name: product.name,
      description: product.description,
      category: product.category,
      imageUrl: product.imageUrl,
      isActive: product.isActive,
      createdAt: product.createdAt,
      updatedAt: product.updatedAt,
    };
  }
}
