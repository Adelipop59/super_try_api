import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateCampaignDto } from './dto/create-campaign.dto';
import { UpdateCampaignDto } from './dto/update-campaign.dto';
import { CampaignFilterDto } from './dto/campaign-filter.dto';
import { CampaignResponseDto } from './dto/campaign-response.dto';
import { CampaignStatus, Prisma } from '@prisma/client';
import {
  PaginatedResponse,
  createPaginatedResponse,
  calculateOffset,
} from '../../common/dto/pagination.dto';
import { CampaignCriteriaService } from './campaign-criteria.service';

// Type for campaign with optimized select (only needed fields)
type CampaignWithIncludes = Prisma.CampaignGetPayload<{
  select: {
    id: true;
    sellerId: true;
    categoryId: true;
    title: true;
    description: true;
    startDate: true;
    endDate: true;
    totalSlots: true;
    availableSlots: true;
    status: true;
    createdAt: true;
    updatedAt: true;
    category: {
      select: {
        id: true;
        name: true;
        slug: true;
        icon: true;
      };
    };
    seller: {
      select: {
        id: true;
        email: true;
        companyName: true;
      };
    };
    offers: {
      select: {
        id: true;
        productId: true;
        quantity: true;
        reimbursedPrice: true;
        reimbursedShipping: true;
        maxReimbursedPrice: true;
        maxReimbursedShipping: true;
        bonus: true;
        createdAt: true;
        product: {
          select: {
            id: true;
            name: true;
            description: true;
            categoryId: true;
            imageUrl: true;
            isActive: true;
            category: {
              select: {
                id: true;
                name: true;
                slug: true;
                icon: true;
              };
            };
          };
        };
      };
    };
  };
}>;

@Injectable()
export class CampaignsService {
  private readonly logger = new Logger(CampaignsService.name);

  constructor(
    private prismaService: PrismaService,
    private campaignCriteriaService: CampaignCriteriaService,
  ) {}

  /**
   * Create a new campaign (draft mode)
   * Only title is required. Other fields can be added progressively.
   */
  async create(
    sellerId: string,
    createCampaignDto: CreateCampaignDto,
  ): Promise<CampaignResponseDto> {
    const { products, criteria, ...campaignData } = createCampaignDto;

    // Validate category if provided
    if (campaignData.categoryId) {
      const category = await this.prismaService.category.findUnique({
        where: { id: campaignData.categoryId },
      });

      if (!category) {
        throw new NotFoundException(`Category ${campaignData.categoryId} not found`);
      }

      if (!category.isActive) {
        throw new BadRequestException(`Category "${category.name}" is not active`);
      }
    }

    // Validate dates if provided
    const startDate = campaignData.startDate
      ? new Date(campaignData.startDate)
      : null;
    const endDate = campaignData.endDate
      ? new Date(campaignData.endDate)
      : null;

    if (startDate && endDate && endDate <= startDate) {
      throw new BadRequestException('End date must be after start date');
    }

    // If products are provided, validate them
    let offersData: any[] = [];
    if (products && products.length > 0) {
      // Validate single product limit
      if (products.length > 1) {
        throw new BadRequestException('Une campagne ne peut avoir qu\'un seul produit');
      }

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

      offersData = products.map((p) => {
        // Find the corresponding product to get its price and shipping
        const product = existingProducts.find((prod) => prod.id === p.productId);
        
        if (!product) {
          throw new NotFoundException(`Product ${p.productId} not found`);
        }

        // Use product price/shipping if reimbursed, otherwise use DTO values
        const reimbursedPrice = p.reimbursedPrice ?? true;
        const reimbursedShipping = p.reimbursedShipping ?? true;
        
        const expectedPrice = reimbursedPrice 
          ? Number(product.price) 
          : (p.expectedPrice ?? Number(product.price));
          
        const shippingCost = reimbursedShipping 
          ? Number(product.shippingCost) 
          : (p.shippingCost ?? Number(product.shippingCost));

        const { priceRangeMin, priceRangeMax } = this.calculatePriceRange(expectedPrice);
        
        return {
          productId: p.productId,
          quantity: p.quantity,
          expectedPrice,
          shippingCost,
          priceRangeMin,
          priceRangeMax,
          reimbursedPrice,
          reimbursedShipping,
          maxReimbursedPrice: p.maxReimbursedPrice,
          maxReimbursedShipping: p.maxReimbursedShipping,
          bonus: p.bonus ?? 0,
        };
      });
    }

    // Create campaign with optional data
    const campaign = await this.prismaService.campaign.create({
      data: {
        title: campaignData.title,
        description: campaignData.description ?? '',
        startDate: startDate ?? new Date(),
        endDate,
        totalSlots: campaignData.totalSlots ?? 0,
        availableSlots: campaignData.totalSlots ?? 0,
        sellerId,
        categoryId: campaignData.categoryId,
        marketplaceMode: campaignData.marketplaceMode,
        marketplace: campaignData.marketplace,
        amazonLink: campaignData.amazonLink,
        offers:
          offersData.length > 0
            ? {
                create: offersData,
              }
            : undefined,
        criteria: criteria
          ? {
              create: criteria,
            }
          : undefined,
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
        offers: {
          include: {
            product: {
              include: {
                category: {
                  select: {
                    id: true,
                    name: true,
                    slug: true,
                    icon: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    return this.formatCampaignResponse(campaign);
  }

  /**
   * Find all campaigns with filters and pagination
   */
  async findAll(
    filters: CampaignFilterDto,
  ): Promise<PaginatedResponse<CampaignResponseDto>> {
    const {
      sellerId,
      status,
      startDateFrom,
      startDateTo,
      hasAvailableSlots,
      page = 1,
      limit = 20,
    } = filters;

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

    const offset = calculateOffset(page, limit);

    const [campaigns, total] = await Promise.all([
      this.prismaService.campaign.findMany({
        where,
        select: {
          id: true,
          sellerId: true,
          categoryId: true,
          title: true,
          description: true,
          startDate: true,
          endDate: true,
          totalSlots: true,
          availableSlots: true,
          status: true,
          createdAt: true,
          updatedAt: true,
          category: {
            select: {
              id: true,
              name: true,
              slug: true,
              icon: true,
            },
          },
          seller: {
            select: {
              id: true,
              email: true,
              companyName: true,
            },
          },
          offers: {
            select: {
              id: true,
              productId: true,
              quantity: true,
              reimbursedPrice: true,
              reimbursedShipping: true,
              maxReimbursedPrice: true,
              maxReimbursedShipping: true,
              bonus: true,
              createdAt: true,
              product: {
                select: {
                  id: true,
                  name: true,
                  description: true,
                  categoryId: true,
                  imageUrl: true,
                  isActive: true,
                  category: {
                    select: {
                      id: true,
                      name: true,
                      slug: true,
                      icon: true,
                    },
                  },
                },
              },
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
        take: limit,
        skip: offset,
      }),
      this.prismaService.campaign.count({ where }),
    ]);

    const data = campaigns.map((campaign) =>
      this.formatCampaignResponse(campaign),
    );

    return createPaginatedResponse(data, total, page, limit);
  }

  /**
   * Find active campaigns only (public endpoint)
   */
  async findAllActive(
    filters: CampaignFilterDto,
  ): Promise<PaginatedResponse<CampaignResponseDto>> {
    return this.findAll({ ...filters, status: CampaignStatus.ACTIVE });
  }

  /**
   * Find eligible campaigns for a specific tester (OPTIMIZED)
   * Returns only campaigns where the tester meets all criteria
   * Uses batch eligibility checking to avoid N+1 queries
   *
   * Si l'utilisateur n'est pas vérifié KYC, retourne un teaser sans détails
   */
  async findEligibleForTester(
    testerId: string,
    filters: CampaignFilterDto,
  ): Promise<PaginatedResponse<CampaignResponseDto & { eligibilityReasons?: string[] }> | any> {
    // Vérifier le statut KYC du testeur
    const tester = await this.prismaService.profile.findUnique({
      where: { id: testerId },
      select: {
        isVerified: true,
        verificationStatus: true,
      },
    });

    if (!tester) {
      throw new NotFoundException('Tester profile not found');
    }

    // Si non vérifié, retourner des campagnes avec données floutées (limité à 50)
    if (!tester.isVerified) {
      return this.getBlurredCampaigns(filters);
    }

    // Get all active campaigns first (1 query with includes)
    const activeCampaigns = await this.findAll({
      ...filters,
      status: CampaignStatus.ACTIVE,
    });

    // If no campaigns, return early
    if (activeCampaigns.data.length === 0) {
      return {
        data: [],
        meta: {
          total: 0,
          page: filters.page || 1,
          limit: filters.limit || 10,
          totalPages: 0,
          hasNextPage: false,
          hasPreviousPage: false,
        },
      };
    }

    // Extract campaign IDs
    const campaignIds = activeCampaigns.data.map((c) => c.id);

    // Batch eligibility check (5-6 queries total instead of N×5)
    const eligibilityMap = await this.campaignCriteriaService.checkBatchEligibility(
      testerId,
      campaignIds,
    );

    // Filter campaigns based on eligibility (in-memory operation)
    const eligibleCampaigns: (CampaignResponseDto & { eligibilityReasons?: string[] })[] = [];

    for (const campaign of activeCampaigns.data) {
      const eligibility = eligibilityMap.get(campaign.id);

      if (eligibility?.eligible) {
        eligibleCampaigns.push(campaign);
      }
    }

    const page = filters.page || 1;
    const limit = filters.limit || 10;
    const totalPages = Math.ceil(eligibleCampaigns.length / limit);

    return {
      data: eligibleCampaigns,
      meta: {
        total: eligibleCampaigns.length,
        page,
        limit,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
    };
  }

  /**
   * Find campaign by ID
   */
  async findOne(id: string): Promise<CampaignResponseDto> {
    const campaign = await this.prismaService.campaign.findUnique({
      where: { id },
      include: {
        category: {
          select: {
            id: true,
            name: true,
            slug: true,
            icon: true,
          },
        },
        seller: {
          select: {
            id: true,
            email: true,
            companyName: true,
          },
        },
        offers: {
          include: {
            product: {
              include: {
                category: {
                  select: {
                    id: true,
                    name: true,
                    slug: true,
                    icon: true,
                  },
                },
              },
            },
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
   * Find campaigns by seller ID with pagination
   */
  async findBySeller(
    sellerId: string,
    page: number = 1,
    limit: number = 20,
  ): Promise<PaginatedResponse<CampaignResponseDto>> {
    const where = { sellerId };
    const offset = calculateOffset(page, limit);

    const [campaigns, total] = await Promise.all([
      this.prismaService.campaign.findMany({
        where,
        select: {
          id: true,
          sellerId: true,
          categoryId: true,
          title: true,
          description: true,
          startDate: true,
          endDate: true,
          totalSlots: true,
          availableSlots: true,
          status: true,
          createdAt: true,
          updatedAt: true,
          category: {
            select: {
              id: true,
              name: true,
              slug: true,
              icon: true,
            },
          },
          seller: {
            select: {
              id: true,
              email: true,
              companyName: true,
            },
          },
          offers: {
            select: {
              id: true,
              productId: true,
              quantity: true,
              reimbursedPrice: true,
              reimbursedShipping: true,
              maxReimbursedPrice: true,
              maxReimbursedShipping: true,
              bonus: true,
              createdAt: true,
              product: {
                select: {
                  id: true,
                  name: true,
                  description: true,
                  categoryId: true,
                  imageUrl: true,
                  isActive: true,
                  category: {
                    select: {
                      id: true,
                      name: true,
                      slug: true,
                      icon: true,
                    },
                  },
                },
              },
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
        take: limit,
        skip: offset,
      }),
      this.prismaService.campaign.count({ where }),
    ]);

    const data = campaigns.map((campaign) =>
      this.formatCampaignResponse(campaign),
    );

    return createPaginatedResponse(data, total, page, limit);
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

    // Cannot update COMPLETED, CANCELLED, ACTIVE or PENDING_PAYMENT campaigns
    if (
      campaign.status === CampaignStatus.COMPLETED ||
      campaign.status === CampaignStatus.CANCELLED ||
      campaign.status === CampaignStatus.ACTIVE ||
      campaign.status === CampaignStatus.PENDING_PAYMENT
    ) {
      throw new BadRequestException(
        `Cannot update ${campaign.status.toLowerCase()} campaign. Only DRAFT campaigns can be modified.`,
      );
    }

    const { products, criteria, ...campaignData } = updateCampaignDto;
    const data: any = { ...campaignData };

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

    // If products are provided, validate and replace them
    if (products && products.length > 0) {
      // Validate single product limit
      if (products.length > 1) {
        throw new BadRequestException('Une campagne ne peut avoir qu\'un seul produit');
      }

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

      // Delete existing offers and create new ones
      await this.prismaService.offer.deleteMany({
        where: { campaignId: id },
      });

      data.offers = {
        create: products.map((p) => {
          // Find the corresponding product to get its price and shipping
          const product = existingProducts.find((prod) => prod.id === p.productId);
          
          if (!product) {
            throw new NotFoundException(`Product ${p.productId} not found`);
          }

          // Use product price/shipping if reimbursed, otherwise use DTO values
          const reimbursedPrice = p.reimbursedPrice ?? true;
          const reimbursedShipping = p.reimbursedShipping ?? true;
          
          const expectedPrice = reimbursedPrice 
            ? Number(product.price) 
            : (p.expectedPrice ?? Number(product.price));
            
          const shippingCost = reimbursedShipping 
            ? Number(product.shippingCost) 
            : (p.shippingCost ?? Number(product.shippingCost));

          const { priceRangeMin, priceRangeMax } = this.calculatePriceRange(expectedPrice);
          
          return {
            productId: p.productId,
            quantity: p.quantity,
            expectedPrice,
            shippingCost,
            priceRangeMin,
            priceRangeMax,
            reimbursedPrice,
            reimbursedShipping,
            maxReimbursedPrice: p.maxReimbursedPrice,
            maxReimbursedShipping: p.maxReimbursedShipping,
            bonus: p.bonus ?? 0,
          };
        }),
      };
    }

    // If criteria are provided, update or create them
    if (criteria !== undefined) {
      // Check if criteria already exist for this campaign
      const existingCriteria = await this.prismaService.campaignCriteria.findUnique({
        where: { campaignId: id },
      });

      if (existingCriteria) {
        // Update existing criteria
        data.criteria = {
          update: criteria,
        };
      } else {
        // Create new criteria
        data.criteria = {
          create: criteria,
        };
      }
    }

    const updatedCampaign = await this.prismaService.campaign.update({
      where: { id },
      data,
      include: {
        category: {
          select: {
            id: true,
            name: true,
            slug: true,
            icon: true,
          },
        },
        seller: {
          select: {
            id: true,
            email: true,
            companyName: true,
          },
        },
        offers: {
          include: {
            product: {
              include: {
                category: {
                  select: {
                    id: true,
                    name: true,
                    slug: true,
                    icon: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    return this.formatCampaignResponse(updatedCampaign);
  }

  /**
   * Add products to an existing campaign
   */
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
        procedures: true,
        distributions: true,
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

    // Full validation before PENDING_PAYMENT
    if (newStatus === CampaignStatus.PENDING_PAYMENT) {
      this.validateCampaignForPublication(campaign);
    }

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
        category: {
          select: {
            id: true,
            name: true,
            slug: true,
            icon: true,
          },
        },
        seller: {
          select: {
            id: true,
            email: true,
            companyName: true,
          },
        },
        offers: {
          include: {
            product: {
              include: {
                category: {
                  select: {
                    id: true,
                    name: true,
                    slug: true,
                    icon: true,
                  },
                },
              },
            },
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
    // PENDING_PAYMENT, ACTIVE, COMPLETED, CANCELLED cannot be deleted
    if (campaign.status !== CampaignStatus.DRAFT) {
      throw new BadRequestException(
        `Cannot delete ${campaign.status.toLowerCase()} campaign. Only DRAFT campaigns can be deleted.`,
      );
    }

    await this.prismaService.campaign.delete({
      where: { id },
    });

    return { message: 'Campaign deleted successfully' };
  }

  /**
   * Validate campaign has all required data before payment
   * This is a public method that can be called by StripeService
   */
  async validateCampaignForPayment(
    campaignId: string,
    sellerId: string,
  ): Promise<{
    campaign: any;
    totalAmountCents: number;
    errors: string[];
  }> {
    const campaign = await this.prismaService.campaign.findUnique({
      where: { id: campaignId },
      include: {
        offers: {
          include: {
            product: true,
          },
        },
        procedures: {
          include: {
            steps: true,
          },
        },
        distributions: true,
      },
    });

    if (!campaign) {
      throw new NotFoundException('Campaign not found');
    }

    // Vérifier que l'utilisateur est le propriétaire
    if (campaign.sellerId !== sellerId) {
      throw new ForbiddenException('You are not the owner of this campaign');
    }

    // Vérifier que la campagne est en DRAFT ou PENDING_PAYMENT
    if (campaign.status !== CampaignStatus.DRAFT && campaign.status !== CampaignStatus.PENDING_PAYMENT) {
      throw new BadRequestException('Campaign must be in DRAFT or PENDING_PAYMENT status');
    }

    const errors: string[] = [];

    // Validate basic info
    if (!campaign.title || campaign.title.trim().length < 5) {
      errors.push('Title is required (minimum 5 characters)');
    }

    if (!campaign.description || campaign.description.trim().length < 20) {
      errors.push('Description is required (minimum 20 characters)');
    }

    if (!campaign.startDate) {
      errors.push('Start date is required');
    } else {
      const now = new Date();
      // Skip date validation in test mode
      if (process.env.DISABLE_DATE_VALIDATION !== 'true' && campaign.startDate < now) {
        errors.push('Start date must be in the future');
      }
    }

    if (campaign.endDate && campaign.endDate <= campaign.startDate) {
      errors.push('End date must be after start date');
    }

    // Note: totalSlots is deprecated - we now use product quantity in offers
    // The number of available slots is determined by the product quantity

    // Validate offers (products)
    if (!campaign.offers || campaign.offers.length === 0) {
      errors.push('Exactly one product is required');
    } else if (campaign.offers.length !== 1) {
      errors.push('Campaign must have exactly one product');
    } else {
      let totalQuantity = 0;

      for (let i = 0; i < campaign.offers.length; i++) {
        const offer = campaign.offers[i];
        const offerIndex = i + 1;

        // Validate product exists and belongs to seller
        if (!offer.product) {
          errors.push(`Offer #${offerIndex}: Product not found`);
        } else {
          if (offer.product.sellerId !== sellerId) {
            errors.push(`Offer #${offerIndex}: Product "${offer.product.name}" does not belong to you`);
          }
          if (!offer.product.isActive) {
            errors.push(`Offer #${offerIndex}: Product "${offer.product.name}" is inactive`);
          }
        }

        // Validate quantity
        if (!offer.quantity || offer.quantity < 1) {
          errors.push(`Offer #${offerIndex}: Quantity must be at least 1`);
        } else {
          totalQuantity += offer.quantity;
        }

        // Validate prices
        // Note: expectedPrice and shippingCost can come from the product itself
        // If not set in offer, they will be taken from product during creation
        const expectedPrice = offer.expectedPrice ? Number(offer.expectedPrice) : 0;
        const shippingCost = offer.shippingCost ? Number(offer.shippingCost) : 0;
        const bonus = Number(offer.bonus);
        const priceRangeMin = Number(offer.priceRangeMin);
        const priceRangeMax = Number(offer.priceRangeMax);

        // Skip price validation if it's 0 (will be taken from product)
        if (expectedPrice > 0 && isNaN(expectedPrice)) {
          errors.push(`Offer #${offerIndex}: Expected price is invalid`);
        }

        if (shippingCost > 0 && isNaN(shippingCost)) {
          errors.push(`Offer #${offerIndex}: Shipping cost is invalid`);
        }

        if (isNaN(bonus) || bonus < 0) {
          errors.push(`Offer #${offerIndex}: Bonus cannot be negative`);
        }

        if (priceRangeMin > priceRangeMax) {
          errors.push(`Offer #${offerIndex}: Price range min cannot be greater than max`);
        }

        // Validate max reimbursement limits
        if (offer.maxReimbursedPrice !== null) {
          const maxReimbursedPrice = Number(offer.maxReimbursedPrice);
          if (isNaN(maxReimbursedPrice) || maxReimbursedPrice < 0) {
            errors.push(`Offer #${offerIndex}: Max reimbursed price cannot be negative`);
          }
        }

        if (offer.maxReimbursedShipping !== null) {
          const maxReimbursedShipping = Number(offer.maxReimbursedShipping);
          if (isNaN(maxReimbursedShipping) || maxReimbursedShipping < 0) {
            errors.push(`Offer #${offerIndex}: Max reimbursed shipping cannot be negative`);
          }
        }
      }

      // Note: quantity in offer represents the number of product units available,
      // not the number of testers. Multiple testers can share or review the same product.
      // So we don't enforce quantity === totalSlots
    }

    // Validate procedures - conditionally based on marketplace mode
    if (campaign.marketplaceMode === 'AMAZON_DIRECT_LINK') {
      // Mode Amazon Direct Link
      if (!campaign.amazonLink || campaign.amazonLink.trim().length === 0) {
        errors.push('Amazon link is required for AMAZON_DIRECT_LINK mode');
      }

      // Marketplace recommandé mais pas obligatoire
      if (!campaign.marketplace) {
        this.logger.warn(
          `Campaign ${campaignId}: AMAZON_DIRECT_LINK mode without marketplace defined`
        );
      }

      // Procédures et distributions sont OPTIONNELLES en mode AMAZON_DIRECT_LINK
      // (le testeur n'a qu'à acheter via le lien)
    } else {
      // Mode PROCEDURES classique
      if (!campaign.procedures || campaign.procedures.length === 0) {
        errors.push('At least one procedure is required in PROCEDURES mode');
      } else {
        for (let i = 0; i < campaign.procedures.length; i++) {
          const procedure = campaign.procedures[i];
          const procIndex = i + 1;

          if (!procedure.title || procedure.title.trim().length < 3) {
            errors.push(`Procedure #${procIndex}: Title is required (minimum 3 characters)`);
          }

          if (!procedure.steps || procedure.steps.length === 0) {
            errors.push(`Procedure #${procIndex}: At least one step is required`);
          }
        }
      }
    }

    // Validate distributions - only required for PROCEDURES mode
    if (campaign.marketplaceMode === 'PROCEDURES' || !campaign.marketplaceMode) {
      if (!campaign.distributions || campaign.distributions.length === 0) {
        errors.push('At least one distribution schedule is required in PROCEDURES mode');
      }
    }

    // Check distribution details if they exist
    if (campaign.distributions && campaign.distributions.length > 0) {
      let totalMaxUnits = 0;

      for (let i = 0; i < campaign.distributions.length; i++) {
        const dist = campaign.distributions[i];
        const distIndex = i + 1;

        if (dist.type === 'SPECIFIC_DATE' && !dist.specificDate) {
          errors.push(`Distribution #${distIndex}: Specific date is required for SPECIFIC_DATE type`);
        }

        if (dist.type === 'RECURRING' && (dist.dayOfWeek === null || dist.dayOfWeek === undefined)) {
          errors.push(`Distribution #${distIndex}: Day of week is required for RECURRING type`);
        }

        if (dist.type === 'RECURRING' && dist.dayOfWeek !== null && (dist.dayOfWeek < 0 || dist.dayOfWeek > 6)) {
          errors.push(`Distribution #${distIndex}: Day of week must be between 0 (Sunday) and 6 (Saturday)`);
        }

        // Sum up maxUnits from all distributions
        if (dist.maxUnits && dist.maxUnits > 0) {
          totalMaxUnits += dist.maxUnits;
        }
      }

      // Validate that total maxUnits across all distributions matches available product quantity
      if (campaign.offers.length > 0) {
        const availableQuantity = campaign.offers[0].quantity;
        
        if (totalMaxUnits !== availableQuantity) {
          errors.push(`Total distribution units (${totalMaxUnits}) must match product quantity (${availableQuantity})`);
        }
      }
    }

    if (errors.length > 0) {
      throw new BadRequestException({
        statusCode: 400,
        message: 'Campaign validation failed',
        errors,
      });
    }

    // Calculate total amount
    // Si remboursé, utiliser le prix du produit (temps réel)
    let totalAmountCents = 0;
    for (const offer of campaign.offers) {
      const productPrice = offer.reimbursedPrice 
        ? Number(offer.product.price)
        : Number(offer.expectedPrice);
        
      const shippingCost = offer.reimbursedShipping
        ? Number(offer.product.shippingCost)
        : Number(offer.shippingCost);
      
      const offerTotal = offer.quantity * (
        productPrice +
        shippingCost +
        Number(offer.bonus)
      );
      totalAmountCents += Math.round(offerTotal * 100);
    }

    return {
      campaign,
      totalAmountCents,
      errors: [],
    };
  }

  /**
   * Validate campaign has all required data before publication (PENDING_PAYMENT)
   * Internal method used by updateStatus
   */
  private validateCampaignForPublication(campaign: {
    title: string;
    description: string;
    startDate: Date;
    totalSlots: number;
    offers: any[];
    procedures: any[];
    distributions: any[];
  }): void {
    const errors: string[] = [];

    // Validate basic info
    if (!campaign.title || campaign.title.length < 5) {
      errors.push('Title is required (minimum 5 characters)');
    }

    if (!campaign.description || campaign.description.length < 20) {
      errors.push('Description is required (minimum 20 characters)');
    }

    if (!campaign.startDate) {
      errors.push('Start date is required');
    }

    // Note: totalSlots validation removed - product quantity determines availability

    // Validate offers (products)
    if (!campaign.offers || campaign.offers.length === 0) {
      errors.push('At least one product is required');
    }

    // Validate procedures
    if (!campaign.procedures || campaign.procedures.length === 0) {
      errors.push('At least one procedure is required');
    }

    // Validate distributions
    if (!campaign.distributions || campaign.distributions.length === 0) {
      errors.push('At least one distribution schedule is required');
    }

    if (errors.length > 0) {
      throw new BadRequestException({
        message: 'Campaign is incomplete and cannot be published',
        errors,
      });
    }
  }

  /**
   * Calculate price range based on expected price
   * - Price < 100€: range of 10€
   * - Price 100-500€: range of 50€
   * - Price > 500€: range of 200€
   * The price is rounded down to the nearest multiple of 5
   */
  private calculatePriceRange(expectedPrice: number): {
    priceRangeMin: number;
    priceRangeMax: number;
  } {
    // Round down to nearest multiple of 5
    const roundedPrice = Math.floor(expectedPrice / 5) * 5;

    // Determine range based on price
    let range: number;
    if (expectedPrice < 100) {
      range = 10;
    } else if (expectedPrice <= 500) {
      range = 50;
    } else {
      range = 200;
    }

    const halfRange = range / 2;
    const priceRangeMin = Math.max(0, roundedPrice - halfRange);
    const priceRangeMax = roundedPrice + halfRange;

    return { priceRangeMin, priceRangeMax };
  }

  /**
   * Get campaign cost details
   */
  async getCampaignCost(campaignId: string): Promise<any> {
    const campaign = await this.prismaService.campaign.findUnique({
      where: { id: campaignId },
      include: {
        offers: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                price: true,
                shippingCost: true,
              },
            },
          },
        },
      },
    });

    if (!campaign) {
      throw new NotFoundException(`Campaign with ID ${campaignId} not found`);
    }

    const offers = campaign.offers.map((offer) => {
      // Si remboursé, prendre le prix du produit, sinon celui de l'offre
      const expectedPrice = offer.reimbursedPrice 
        ? Number(offer.product.price)
        : Number(offer.expectedPrice);
        
      const shippingCost = offer.reimbursedShipping
        ? Number(offer.product.shippingCost)
        : Number(offer.shippingCost);
        
      const bonus = Number(offer.bonus);
      const quantity = offer.quantity;

      const costPerUnit = expectedPrice + shippingCost + bonus;
      const totalCost = costPerUnit * quantity;

      return {
        productId: offer.productId,
        productName: offer.product.name,
        quantity,
        expectedPrice,
        shippingCost,
        bonus,
        reimbursedPrice: offer.reimbursedPrice,
        reimbursedShipping: offer.reimbursedShipping,
        costPerUnit,
        totalCost,
      };
    });

    const totalCampaignCost = offers.reduce((sum, offer) => sum + offer.totalCost, 0);

    return {
      campaignId: campaign.id,
      campaignTitle: campaign.title,
      offers,
      totalCampaignCost,
      totalCampaignCostCents: Math.round(totalCampaignCost * 100),
      currency: 'EUR',
    };
  }

  /**
   * Validate status transition
   */
  private validateStatusTransition(
    currentStatus: CampaignStatus,
    newStatus: CampaignStatus,
  ): void {
    const validTransitions: Record<CampaignStatus, CampaignStatus[]> = {
      [CampaignStatus.DRAFT]: [
        CampaignStatus.PENDING_PAYMENT,
        CampaignStatus.CANCELLED,
      ],
      [CampaignStatus.PENDING_PAYMENT]: [
        CampaignStatus.ACTIVE,
        CampaignStatus.CANCELLED,
      ],
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
  private formatCampaignResponse(
    campaign: CampaignWithIncludes,
  ): CampaignResponseDto {
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
      categoryId: campaign.categoryId,
      category: campaign.category,
      products: campaign.offers.map((offer) => ({
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
          categoryId: offer.product.categoryId,
          category: offer.product.category,
          imageUrl: offer.product.imageUrl,
          isActive: offer.product.isActive,
        },
      })),
      createdAt: campaign.createdAt,
      updatedAt: campaign.updatedAt,
    };
  }

  /**
   * Retourne des campagnes avec données floutées pour utilisateurs non-KYC
   * Limité à 50 campagnes maximum
   * Affiche uniquement: fausse image, bonus, remboursement (prix + shipping)
   */
  private async getBlurredCampaigns(
    filters: CampaignFilterDto,
  ): Promise<any> {
    const page = filters.page || 1;
    const requestedLimit = filters.limit || 20;
    // Limiter strictement à 50 max pour éviter surcharge DB
    const limit = Math.min(requestedLimit, 50);
    const offset = calculateOffset(page, limit);

    // Récupérer les campagnes actives avec données minimales
    const [campaigns, total] = await Promise.all([
      this.prismaService.campaign.findMany({
        where: {
          status: CampaignStatus.ACTIVE,
          availableSlots: { gt: 0 },
        },
        select: {
          id: true,
          offers: {
            select: {
              bonus: true,
              reimbursedPrice: true,
              reimbursedShipping: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      // Compter le total (limité à 50)
      this.prismaService.campaign
        .count({
          where: {
            status: CampaignStatus.ACTIVE,
            availableSlots: { gt: 0 },
          },
        })
        .then((count) => Math.min(count, 50)),
    ]);

    // URL de placeholder générique (non-informative)
    const PLACEHOLDER_IMAGE =
      'https://via.placeholder.com/400x400/CCCCCC/666666?text=Product';

    // Formatter les données floutées
    const blurredData = campaigns.map((campaign) => ({
      id: campaign.id,
      // Image placeholder générique
      imageUrl: PLACEHOLDER_IMAGE,
      // Bonus (visible)
      bonus: campaign.offers[0]?.bonus
        ? Number(campaign.offers[0].bonus).toFixed(2)
        : '0.00',
      // Info remboursement (visible)
      reimbursedPrice: campaign.offers[0]?.reimbursedPrice ?? false,
      reimbursedShipping: campaign.offers[0]?.reimbursedShipping ?? false,
      // Indicateur qu'il faut KYC
      requiresKyc: true,
    }));

    return createPaginatedResponse(blurredData, total, page, limit);
  }

  /**
   * Get campaign applications (sessions)
   */
  async getCampaignApplications(
    campaignId: string,
    userId: string,
    isAdmin: boolean,
    status?: string,
    page: number = 1,
    limit: number = 20,
  ): Promise<any> {
    // Vérifier que la campagne existe
    const campaign = await this.prismaService.campaign.findUnique({
      where: { id: campaignId },
      select: {
        id: true,
        sellerId: true,
        title: true,
      },
    });

    if (!campaign) {
      throw new NotFoundException('Campaign not found');
    }

    // Vérifier ownership (sauf admin)
    if (!isAdmin && campaign.sellerId !== userId) {
      throw new ForbiddenException('You can only view applications for your own campaigns');
    }

    // Construire le filtre
    const where: any = {
      campaignId,
    };

    if (status) {
      where.status = status;
    }

    // Pagination
    const offset = calculateOffset(page, Math.min(limit, 100));
    const take = Math.min(limit, 100);

    // Récupérer les candidatures
    const [applications, total] = await Promise.all([
      this.prismaService.session.findMany({
        where,
        select: {
          id: true,
          status: true,
          applicationMessage: true,
          appliedAt: true,
          acceptedAt: true,
          rejectedAt: true,
          rejectionReason: true,
          scheduledPurchaseDate: true,
          purchasedAt: true,
          submittedAt: true,
          completedAt: true,
          cancelledAt: true,
          cancellationReason: true,
          rating: true,
          ratingComment: true,
          tester: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
              avatar: true,
              averageRating: true,
              completedSessionsCount: true,
            },
          },
        },
        orderBy: {
          appliedAt: 'desc',
        },
        skip: offset,
        take,
      }),
      this.prismaService.session.count({ where }),
    ]);

    return createPaginatedResponse(applications, total, page, take);
  }
}
