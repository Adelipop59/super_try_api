import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ProductFilterDto } from './dto/product-filter.dto';
import { ProductResponseDto } from './dto/product-response.dto';
import { ProductImageDto } from './dto/product-image.dto';
import { Prisma } from '@prisma/client';
import {
  PaginatedResponse,
  createPaginatedResponse,
  calculateOffset,
} from '../../common/dto/pagination.dto';
import { UploadService } from '../upload/upload.service';

// Type for product with all includes
type ProductWithIncludes = Prisma.ProductGetPayload<{
  include: {
    seller: {
      select: {
        id: true;
        email: true;
        companyName: true;
      };
    };
    category: {
      select: {
        id: true;
        name: true;
        slug: true;
        icon: true;
      };
    };
  };
}>;

@Injectable()
export class ProductsService {
  constructor(
    private prismaService: PrismaService,
    private uploadService: UploadService,
  ) {}

  /**
   * Create a new product in the catalog.
   * Note: Financial details (price, shipping, rewards) are defined per campaign via the Offer model.
   */
  async create(
    sellerId: string,
    createProductDto: CreateProductDto,
    files?: Express.Multer.File[],
  ): Promise<ProductResponseDto> {
    const { images, ...productData } = createProductDto;

    // Auto-génération URL Amazon si ASIN fourni et pas de productUrl
    if (productData.asin && !productData.productUrl) {
      productData.productUrl = `https://www.amazon.fr/dp/${productData.asin}`;
    }

    // Valider que la catégorie existe et est active
    if (productData.categoryId) {
      const category = await this.prismaService.category.findUnique({
        where: { id: productData.categoryId },
      });

      if (!category) {
        throw new BadRequestException('Catégorie introuvable');
      }

      if (!category.isActive) {
        throw new BadRequestException('Cette catégorie est désactivée');
      }
    }

    // Créer le produit d'abord
    const product = await this.prismaService.product.create({
      data: {
        ...productData,
        sellerId,
        images: images ? (images as any) : undefined,
      },
      include: {
        seller: {
          select: {
            id: true,
            email: true,
            companyName: true,
          },
        },
        category: {
          select: {
            id: true,
            name: true,
            slug: true,
            icon: true,
          },
        },
      },
    });

    // Upload des images si des fichiers sont fournis
    if (files && files.length > 0) {
      // Upload vers S3
      const urls = await this.uploadService.uploadMultipleImages(
        files,
        'products',
        product.id,
      );

      // Créer les objets images
      const uploadedImages = urls.map((url, index) => ({
        url,
        order: index,
        isPrimary: index === 0, // Première image = primaire
      }));

      // Mettre à jour avec les images
      const updatedProduct = await this.prismaService.product.update({
        where: { id: product.id },
        data: { images: uploadedImages as any },
        include: {
          seller: {
            select: {
              id: true,
              email: true,
              companyName: true,
            },
          },
          category: {
            select: {
              id: true,
              name: true,
              slug: true,
              icon: true,
            },
          },
        },
      });

      return await this.formatProductResponse(updatedProduct);
    }

    return await this.formatProductResponse(product);
  }

  /**
   * Find all products with filters and pagination (ADMIN only)
   */
  async findAll(
    filters: ProductFilterDto,
  ): Promise<PaginatedResponse<ProductResponseDto>> {
    const { sellerId, category, isActive, page = 1, limit = 20 } = filters;

    const where: any = {};

    if (sellerId) where.sellerId = sellerId;
    if (category) where.category = category;
    if (isActive !== undefined) where.isActive = isActive;

    const offset = calculateOffset(page, limit);

    const [products, total] = await Promise.all([
      this.prismaService.product.findMany({
        where,
        include: {
          seller: {
            select: {
              id: true,
              email: true,
              companyName: true,
            },
          },
          category: {
            select: {
              id: true,
              name: true,
              slug: true,
              icon: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
        take: limit,
        skip: offset,
      }),
      this.prismaService.product.count({ where }),
    ]);

    const data = await Promise.all(
      products.map((product) => this.formatProductResponse(product)),
    );

    return createPaginatedResponse(data, total, page, limit);
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
        category: {
          select: {
            id: true,
            name: true,
            slug: true,
            icon: true,
          },
        },
      },
    });

    if (!product) {
      throw new NotFoundException(`Product with ID ${id} not found`);
    }

    return await this.formatProductResponse(product);
  }

  /**
   * Find products by seller ID with pagination
   */
  async findBySeller(
    sellerId: string,
    page: number = 1,
    limit: number = 20,
  ): Promise<PaginatedResponse<ProductResponseDto>> {
    const where = { sellerId };
    const offset = calculateOffset(page, limit);

    const [products, total] = await Promise.all([
      this.prismaService.product.findMany({
        where,
        include: {
          seller: {
            select: {
              id: true,
              email: true,
              companyName: true,
            },
          },
          category: {
            select: {
              id: true,
              name: true,
              slug: true,
              icon: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
        take: limit,
        skip: offset,
      }),
      this.prismaService.product.count({ where }),
    ]);

    const data = await Promise.all(
      products.map((product) => this.formatProductResponse(product)),
    );

    return createPaginatedResponse(data, total, page, limit);
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

    const { images, ...updateData } = updateProductDto;

    // Auto-génération URL Amazon si ASIN fourni et pas de productUrl
    if (updateData.asin && !updateData.productUrl) {
      updateData.productUrl = `https://www.amazon.fr/dp/${updateData.asin}`;
    }

    // Valider que la catégorie existe et est active si elle est modifiée
    if (updateData.categoryId) {
      const category = await this.prismaService.category.findUnique({
        where: { id: updateData.categoryId },
      });

      if (!category) {
        throw new BadRequestException('Catégorie introuvable');
      }

      if (!category.isActive) {
        throw new BadRequestException('Cette catégorie est désactivée');
      }
    }

    const updatedProduct = await this.prismaService.product.update({
      where: { id },
      data: {
        ...updateData,
        images: images ? (images as any) : undefined,
      },
      include: {
        seller: {
          select: {
            id: true,
            email: true,
            companyName: true,
          },
        },
        category: {
          select: {
            id: true,
            name: true,
            slug: true,
            icon: true,
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

    // Check if product is in any active campaigns
    const activeCampaigns = await this.prismaService.campaign.findMany({
      where: {
        status: { in: ['DRAFT', 'ACTIVE'] },
        offers: {
          some: {
            productId: id,
          },
        },
      },
      select: {
        id: true,
        title: true,
        status: true,
      },
    });

    if (activeCampaigns.length > 0) {
      const campaignTitles = activeCampaigns
        .map((c) => `"${c.title}" (${c.status})`)
        .join(', ');
      throw new BadRequestException(
        `Cannot deactivate product. It is used in active campaigns: ${campaignTitles}`,
      );
    }

    await this.prismaService.product.update({
      where: { id },
      data: { isActive: false },
    });

    return { message: 'Product deactivated successfully' };
  }

  /**
   * Activate product (seller or admin)
   */
  async activate(
    id: string,
    sellerId: string,
    isAdmin: boolean = false,
  ): Promise<ProductResponseDto> {
    const product = await this.prismaService.product.findUnique({
      where: { id },
    });

    if (!product) {
      throw new NotFoundException(`Product with ID ${id} not found`);
    }

    if (!isAdmin && product.sellerId !== sellerId) {
      throw new ForbiddenException('You can only activate your own products');
    }

    const updatedProduct = await this.prismaService.product.update({
      where: { id },
      data: { isActive: true },
      include: {
        seller: {
          select: {
            id: true,
            email: true,
            companyName: true,
          },
        },
        category: {
          select: {
            id: true,
            name: true,
            slug: true,
            icon: true,
          },
        },
      },
    });

    return this.formatProductResponse(updatedProduct);
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
        category: {
          select: {
            id: true,
            name: true,
            slug: true,
            icon: true,
          },
        },
      },
    });

    return this.formatProductResponse(updatedProduct);
  }

  /**
   * Format product response with signed URLs for images
   */
  private async formatProductResponse(
    product: ProductWithIncludes,
  ): Promise<ProductResponseDto> {
    // Generate signed URLs for images array (valid for 24 hours)
    const signedImages = product.images
      ? await this.uploadService.signImagesArray(
          product.images as unknown as ProductImageDto[],
          86400, // 24 hours
        )
      : null;

    return {
      id: product.id,
      sellerId: product.sellerId,
      seller: product.seller,
      categoryId: product.categoryId,
      category: product.category,
      name: product.name,
      description: product.description,
      imageUrl: null, // Legacy field - removed from schema
      productUrl: product.productUrl,
      images: signedImages,
      price: product.price.toNumber(),
      shippingCost: product.shippingCost.toNumber(),
      isActive: product.isActive,
      createdAt: product.createdAt,
      updatedAt: product.updatedAt,
    };
  }

  /**
   * Add images to a product
   */
  async addProductImages(
    productId: string,
    files: Express.Multer.File[],
    sellerId: string,
  ): Promise<ProductResponseDto> {
    // Verify ownership
    const productResponse = await this.findOne(productId);
    if (productResponse.sellerId !== sellerId) {
      throw new ForbiddenException('You can only modify your own products');
    }

    // Upload images to S3
    const urls = await this.uploadService.uploadMultipleImages(
      files,
      'products',
      productId,
    );

    // Get existing images
    const existingImages =
      (productResponse.images as ProductImageDto[] | null) || [];
    const maxOrder = existingImages.reduce(
      (max, img) => Math.max(max, img.order),
      -1,
    );

    // Create new image objects
    const newImages = urls.map((url, index) => ({
      url,
      order: maxOrder + index + 1,
      isPrimary: existingImages.length === 0 && index === 0, // First image is primary if none exist
    }));

    // Merge with existing images
    const allImages = [...existingImages, ...newImages];

    // Update product
    const updated = await this.prismaService.product.update({
      where: { id: productId },
      data: { images: allImages as any },
      include: {
        seller: {
          select: {
            id: true,
            email: true,
            companyName: true,
          },
        },
        category: {
          select: {
            id: true,
            name: true,
            slug: true,
            icon: true,
          },
        },
      },
    });

    return await this.formatProductResponse(updated);
  }

  /**
   * Remove an image from a product
   */
  async removeProductImage(
    productId: string,
    imageUrl: string,
    sellerId: string,
  ): Promise<ProductResponseDto> {
    // Verify ownership
    const productResponse = await this.findOne(productId);
    if (productResponse.sellerId !== sellerId) {
      throw new ForbiddenException('You can only modify your own products');
    }

    // Remove from S3
    await this.uploadService.deleteImage(imageUrl);

    // Remove from database
    const existingImages =
      (productResponse.images as ProductImageDto[] | null) || [];
    const updatedImages = existingImages.filter((img) => img.url !== imageUrl);

    // Update product
    const updated = await this.prismaService.product.update({
      where: { id: productId },
      data: { images: updatedImages as any },
      include: {
        seller: {
          select: {
            id: true,
            email: true,
            companyName: true,
          },
        },
        category: {
          select: {
            id: true,
            name: true,
            slug: true,
            icon: true,
          },
        },
      },
    });

    return await this.formatProductResponse(updated);
  }

  /**
   * Update image order or set primary image
   */
  async updateProductImages(
    productId: string,
    images: ProductImageDto[],
    sellerId: string,
  ): Promise<ProductResponseDto> {
    // Verify ownership
    const productResponse = await this.findOne(productId);
    if (productResponse.sellerId !== sellerId) {
      throw new ForbiddenException('You can only modify your own products');
    }

    // Update product
    const updated = await this.prismaService.product.update({
      where: { id: productId },
      data: { images: images as any },
      include: {
        seller: {
          select: {
            id: true,
            email: true,
            companyName: true,
          },
        },
        category: {
          select: {
            id: true,
            name: true,
            slug: true,
            icon: true,
          },
        },
      },
    });

    return await this.formatProductResponse(updated);
  }
}
