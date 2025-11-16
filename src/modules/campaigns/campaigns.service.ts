import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateCampaignDto } from './dto/create-campaign.dto';
import { UpdateCampaignDto } from './dto/update-campaign.dto';
import { CampaignFilterDto } from './dto/campaign-filter.dto';
import { CampaignResponseDto } from './dto/campaign-response.dto';
import { AddProductsToCampaignDto } from './dto/add-products-to-campaign.dto';
import { CampaignStatus } from '@prisma/client';

@Injectable()
export class CampaignsService {
  constructor(private prismaService: PrismaService) {}

  /**
   * Create a new campaign
   */
  async create(
    sellerId: string,
    createCampaignDto: CreateCampaignDto,
  ): Promise<CampaignResponseDto> {
    const { products, ...campaignData } = createCampaignDto;

    // Validate dates
    const startDate = new Date(campaignData.startDate);
    const endDate = campaignData.endDate
      ? new Date(campaignData.endDate)
      : null;

    if (endDate && endDate <= startDate) {
      throw new BadRequestException('End date must be after start date');
    }

    // Verify all products exist and belong to the seller
    const productIds = products.map((p) => p.productId);
    const existingProducts = await this.prismaService.product.findMany({
      where: {
        id: { in: productIds },
      },
    });

    if (existingProducts.length !== productIds.length) {
      throw new NotFoundException('One or more products not found');
    }

    // Check that all products belong to the seller
    const notOwnedProducts = existingProducts.filter(
      (p) => p.sellerId !== sellerId,
    );
    if (notOwnedProducts.length > 0) {
      throw new ForbiddenException(
        'You can only add your own products to a campaign',
      );
    }

    // Check that products are active
    const inactiveProducts = existingProducts.filter((p) => !p.isActive);
    if (inactiveProducts.length > 0) {
      throw new BadRequestException(
        `Cannot add inactive products to campaign: ${inactiveProducts.map((p) => p.name).join(', ')}`,
      );
    }

    // Create campaign with products
    const campaign = await this.prismaService.campaign.create({
      data: {
        ...campaignData,
        startDate,
        endDate,
        availableSlots: campaignData.totalSlots,
        sellerId,
        offers: {
          create: products.map((p) => ({
            productId: p.productId,
            quantity: p.quantity,
            reimbursedPrice: p.reimbursedPrice ?? true,
            reimbursedShipping: p.reimbursedShipping ?? true,
            maxReimbursedPrice: p.maxReimbursedPrice,
            maxReimbursedShipping: p.maxReimbursedShipping,
            bonus: p.bonus ?? 0,
          })),
        },
      },
      include: {
        seller: {
          select: {
            id: true,
            email: true,
            companyName: true,
          },
        },
        offers: {
          include: {
            product: true,
          },
        },
      },
    });

    return this.formatCampaignResponse(campaign);
  }

  /**
   * Find all campaigns with filters
   */
  async findAll(filters: CampaignFilterDto): Promise<CampaignResponseDto[]> {
    const { sellerId, status, startDateFrom, startDateTo, hasAvailableSlots } =
      filters;

    const where: any = {};

    if (sellerId) where.sellerId = sellerId;
    if (status) where.status = status;

    // Date range filter
    if (startDateFrom || startDateTo) {
      where.startDate = {};
      if (startDateFrom) where.startDate.gte = new Date(startDateFrom);
      if (startDateTo) where.startDate.lte = new Date(startDateTo);
    }

    // Available slots filter
    if (hasAvailableSlots === true) {
      where.availableSlots = { gt: 0 };
    }

    const campaigns = await this.prismaService.campaign.findMany({
      where,
      include: {
        seller: {
          select: {
            id: true,
            email: true,
            companyName: true,
          },
        },
        offers: {
          include: {
            product: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return campaigns.map((campaign) => this.formatCampaignResponse(campaign));
  }

  /**
   * Find active campaigns only (public endpoint)
   */
  async findAllActive(
    filters: CampaignFilterDto,
  ): Promise<CampaignResponseDto[]> {
    return this.findAll({ ...filters, status: CampaignStatus.ACTIVE });
  }

  /**
   * Find campaign by ID
   */
  async findOne(id: string): Promise<CampaignResponseDto> {
    const campaign = await this.prismaService.campaign.findUnique({
      where: { id },
      include: {
        seller: {
          select: {
            id: true,
            email: true,
            companyName: true,
          },
        },
        offers: {
          include: {
            product: true,
          },
        },
      },
    });

    if (!campaign) {
      throw new NotFoundException(`Campaign with ID ${id} not found`);
    }

    return this.formatCampaignResponse(campaign);
  }

  /**
   * Find campaigns by seller ID
   */
  async findBySeller(sellerId: string): Promise<CampaignResponseDto[]> {
    const campaigns = await this.prismaService.campaign.findMany({
      where: { sellerId },
      include: {
        seller: {
          select: {
            id: true,
            email: true,
            companyName: true,
          },
        },
        offers: {
          include: {
            product: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return campaigns.map((campaign) => this.formatCampaignResponse(campaign));
  }

  /**
   * Update campaign
   */
  async update(
    id: string,
    sellerId: string,
    updateCampaignDto: UpdateCampaignDto,
    isAdmin: boolean = false,
  ): Promise<CampaignResponseDto> {
    // Check if campaign exists and belongs to seller (unless admin)
    const campaign = await this.prismaService.campaign.findUnique({
      where: { id },
    });

    if (!campaign) {
      throw new NotFoundException(`Campaign with ID ${id} not found`);
    }

    if (!isAdmin && campaign.sellerId !== sellerId) {
      throw new ForbiddenException('You can only update your own campaigns');
    }

    // Cannot update COMPLETED or CANCELLED campaigns
    if (
      campaign.status === CampaignStatus.COMPLETED ||
      campaign.status === CampaignStatus.CANCELLED
    ) {
      throw new BadRequestException(
        `Cannot update ${campaign.status.toLowerCase()} campaign`,
      );
    }

    const data: any = { ...updateCampaignDto };

    // Validate and convert dates
    if (updateCampaignDto.startDate) {
      data.startDate = new Date(updateCampaignDto.startDate);
    }
    if (updateCampaignDto.endDate) {
      data.endDate = new Date(updateCampaignDto.endDate);
    }

    // Validate date logic
    const finalStartDate = data.startDate || campaign.startDate;
    const finalEndDate = data.endDate || campaign.endDate;

    if (finalEndDate && finalEndDate <= finalStartDate) {
      throw new BadRequestException('End date must be after start date');
    }

    // Update availableSlots if totalSlots changed
    if (updateCampaignDto.totalSlots !== undefined) {
      const slotsDiff = updateCampaignDto.totalSlots - campaign.totalSlots;
      data.availableSlots = campaign.availableSlots + slotsDiff;

      if (data.availableSlots < 0) {
        throw new BadRequestException(
          'Cannot reduce total slots below already consumed slots',
        );
      }
    }

    const updatedCampaign = await this.prismaService.campaign.update({
      where: { id },
      data,
      include: {
        seller: {
          select: {
            id: true,
            email: true,
            companyName: true,
          },
        },
        offers: {
          include: {
            product: true,
          },
        },
      },
    });

    return this.formatCampaignResponse(updatedCampaign);
  }

  /**
   * Add products to an existing campaign
   */
  async addProducts(
    id: string,
    sellerId: string,
    addProductsDto: AddProductsToCampaignDto,
    isAdmin: boolean = false,
  ): Promise<CampaignResponseDto> {
    const campaign = await this.prismaService.campaign.findUnique({
      where: { id },
      include: {
        offers: true,
      },
    });

    if (!campaign) {
      throw new NotFoundException(`Campaign with ID ${id} not found`);
    }

    if (!isAdmin && campaign.sellerId !== sellerId) {
      throw new ForbiddenException('You can only modify your own campaigns');
    }

    // Cannot modify COMPLETED or CANCELLED campaigns
    if (
      campaign.status === CampaignStatus.COMPLETED ||
      campaign.status === CampaignStatus.CANCELLED
    ) {
      throw new BadRequestException(
        `Cannot modify ${campaign.status.toLowerCase()} campaign`,
      );
    }

    // Verify products exist and belong to seller
    const productIds = addProductsDto.products.map((p) => p.productId);
    const existingProducts = await this.prismaService.product.findMany({
      where: {
        id: { in: productIds },
      },
    });

    if (existingProducts.length !== productIds.length) {
      throw new NotFoundException('One or more products not found');
    }

    const notOwnedProducts = existingProducts.filter(
      (p) => p.sellerId !== sellerId,
    );
    if (notOwnedProducts.length > 0) {
      throw new ForbiddenException(
        'You can only add your own products to a campaign',
      );
    }

    // Check for duplicates
    const existingProductIds = campaign.offers.map((offer) => offer.productId);
    const duplicates = productIds.filter((id) =>
      existingProductIds.includes(id),
    );
    if (duplicates.length > 0) {
      throw new ConflictException(
        `Products already in campaign: ${duplicates.join(', ')}`,
      );
    }

    // Add products to campaign
    await this.prismaService.offer.createMany({
      data: addProductsDto.products.map((p) => ({
        campaignId: id,
        productId: p.productId,
        quantity: p.quantity,
        reimbursedPrice: p.reimbursedPrice ?? true,
        reimbursedShipping: p.reimbursedShipping ?? true,
        maxReimbursedPrice: p.maxReimbursedPrice,
        maxReimbursedShipping: p.maxReimbursedShipping,
        bonus: p.bonus ?? 0,
      })),
    });

    return this.findOne(id);
  }

  /**
   * Remove product from campaign
   */
  async removeProduct(
    campaignId: string,
    productId: string,
    sellerId: string,
    isAdmin: boolean = false,
  ): Promise<CampaignResponseDto> {
    const campaign = await this.prismaService.campaign.findUnique({
      where: { id: campaignId },
    });

    if (!campaign) {
      throw new NotFoundException(`Campaign with ID ${campaignId} not found`);
    }

    if (!isAdmin && campaign.sellerId !== sellerId) {
      throw new ForbiddenException('You can only modify your own campaigns');
    }

    // Cannot modify COMPLETED or CANCELLED campaigns
    if (
      campaign.status === CampaignStatus.COMPLETED ||
      campaign.status === CampaignStatus.CANCELLED
    ) {
      throw new BadRequestException(
        `Cannot modify ${campaign.status.toLowerCase()} campaign`,
      );
    }

    await this.prismaService.offer.deleteMany({
      where: {
        campaignId,
        productId,
      },
    });

    return this.findOne(campaignId);
  }

  /**
   * Update campaign status
   */
  async updateStatus(
    id: string,
    newStatus: CampaignStatus,
    sellerId: string,
    isAdmin: boolean = false,
  ): Promise<CampaignResponseDto> {
    const campaign = await this.prismaService.campaign.findUnique({
      where: { id },
      include: {
        offers: true,
      },
    });

    if (!campaign) {
      throw new NotFoundException(`Campaign with ID ${id} not found`);
    }

    if (!isAdmin && campaign.sellerId !== sellerId) {
      throw new ForbiddenException('You can only modify your own campaigns');
    }

    // Validate status transitions
    this.validateStatusTransition(campaign.status, newStatus);

    // Check if campaign has offers before activating
    if (newStatus === CampaignStatus.ACTIVE && campaign.offers.length === 0) {
      throw new BadRequestException(
        'Cannot activate campaign without products',
      );
    }

    const updatedCampaign = await this.prismaService.campaign.update({
      where: { id },
      data: { status: newStatus },
      include: {
        seller: {
          select: {
            id: true,
            email: true,
            companyName: true,
          },
        },
        offers: {
          include: {
            product: true,
          },
        },
      },
    });

    return this.formatCampaignResponse(updatedCampaign);
  }

  /**
   * Delete campaign (only DRAFT campaigns can be deleted)
   */
  async remove(
    id: string,
    sellerId: string,
    isAdmin: boolean = false,
  ): Promise<{ message: string }> {
    const campaign = await this.prismaService.campaign.findUnique({
      where: { id },
    });

    if (!campaign) {
      throw new NotFoundException(`Campaign with ID ${id} not found`);
    }

    if (!isAdmin && campaign.sellerId !== sellerId) {
      throw new ForbiddenException('You can only delete your own campaigns');
    }

    // Only DRAFT campaigns can be deleted
    if (campaign.status !== CampaignStatus.DRAFT) {
      throw new BadRequestException(
        `Cannot delete ${campaign.status.toLowerCase()} campaign. Use cancel instead.`,
      );
    }

    await this.prismaService.campaign.delete({
      where: { id },
    });

    return { message: 'Campaign deleted successfully' };
  }

  /**
   * Validate status transition
   */
  private validateStatusTransition(
    currentStatus: CampaignStatus,
    newStatus: CampaignStatus,
  ): void {
    const validTransitions: Record<CampaignStatus, CampaignStatus[]> = {
      [CampaignStatus.DRAFT]: [CampaignStatus.ACTIVE, CampaignStatus.CANCELLED],
      [CampaignStatus.ACTIVE]: [
        CampaignStatus.COMPLETED,
        CampaignStatus.CANCELLED,
      ],
      [CampaignStatus.COMPLETED]: [], // Terminal state
      [CampaignStatus.CANCELLED]: [], // Terminal state
    };

    if (!validTransitions[currentStatus].includes(newStatus)) {
      throw new BadRequestException(
        `Cannot transition from ${currentStatus} to ${newStatus}`,
      );
    }
  }

  /**
   * Format campaign response to convert Decimal and format nested data
   */
  private formatCampaignResponse(campaign: any): CampaignResponseDto {
    return {
      id: campaign.id,
      sellerId: campaign.sellerId,
      seller: campaign.seller,
      title: campaign.title,
      description: campaign.description,
      startDate: campaign.startDate,
      endDate: campaign.endDate,
      totalSlots: campaign.totalSlots,
      availableSlots: campaign.availableSlots,
      status: campaign.status,
      products: campaign.offers.map((offer: any) => ({
        id: offer.id,
        productId: offer.productId,
        quantity: offer.quantity,
        reimbursedPrice: offer.reimbursedPrice,
        reimbursedShipping: offer.reimbursedShipping,
        maxReimbursedPrice: offer.maxReimbursedPrice?.toString(),
        maxReimbursedShipping: offer.maxReimbursedShipping?.toString(),
        bonus: offer.bonus.toString(),
        createdAt: offer.createdAt,
        product: {
          id: offer.product.id,
          name: offer.product.name,
          description: offer.product.description,
          category: offer.product.category,
          imageUrl: offer.product.imageUrl,
          isActive: offer.product.isActive,
        },
      })),
      createdAt: campaign.createdAt,
      updatedAt: campaign.updatedAt,
    };
  }
}
