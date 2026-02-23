import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { UGCStatus, UGCType, Prisma } from '@prisma/client';
import { UGCResponseDto, UGCListResponseDto } from './dto/ugc-response.dto';
import { UgcPricingDto } from './dto/ugc-pricing.dto';

@Injectable()
export class UGCService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Create multiple UGC requests for a session
   */
  async createUGCsForSession(
    sessionId: string,
    requestedBy: string,
    ugcRequests: Array<{
      type: UGCType;
      description: string;
      bonus: number;
      deadline?: string;
    }>,
  ) {
    const ugcs = await Promise.all(
      ugcRequests.map((request) =>
        this.prisma.ugc.create({
          data: {
            type: request.type,
            description: request.description,
            requestedBonus: request.bonus,
            deadline: request.deadline ? new Date(request.deadline) : null,
            status: UGCStatus.REQUESTED,
            sessionId,
            requestedBy,
          },
          include: {
            requester: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                companyName: true,
              },
            },
          },
        }),
      ),
    );

    return ugcs;
  }

  /**
   * Create multiple UGC requests for a chat order
   */
  async createUGCsForChatOrder(
    chatOrderId: string,
    requestedBy: string,
    ugcRequests: Array<{
      type: UGCType;
      description: string;
      bonus: number;
      deadline?: string;
    }>,
  ) {
    const ugcs = await Promise.all(
      ugcRequests.map((request) =>
        this.prisma.ugc.create({
          data: {
            type: request.type,
            description: request.description,
            requestedBonus: request.bonus,
            deadline: request.deadline ? new Date(request.deadline) : null,
            status: UGCStatus.REQUESTED,
            chatOrderId,
            requestedBy,
          },
          include: {
            requester: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                companyName: true,
              },
            },
          },
        }),
      ),
    );

    return ugcs;
  }

  /**
   * Submit UGC content by matching types
   */
  async submitUGCs(
    sessionId: string,
    submittedBy: string,
    ugcSubmissions: Array<{
      type: UGCType;
      contentUrl: string;
      comment?: string;
    }>,
  ) {
    // Get all REQUESTED UGCs for this session
    const requestedUGCs = await this.prisma.ugc.findMany({
      where: {
        sessionId,
        status: UGCStatus.REQUESTED,
      },
    });

    if (requestedUGCs.length === 0) {
      throw new BadRequestException('No UGC requests found for this session');
    }

    // Match submissions with requests by type
    const submittedUGCs = [];
    for (const submission of ugcSubmissions) {
      const ugcToUpdate = requestedUGCs.find((ugc) => ugc.type === submission.type);

      if (!ugcToUpdate) {
        throw new BadRequestException(
          `No UGC request found for type ${submission.type}`,
        );
      }

      const updatedUGC = await this.prisma.ugc.update({
        where: { id: ugcToUpdate.id },
        data: {
          status: UGCStatus.SUBMITTED,
          contentUrl: submission.contentUrl,
          comment: submission.comment,
          submittedAt: new Date(),
          submittedBy,
        },
        include: {
          requester: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              companyName: true,
            },
          },
          submitter: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              avatar: true,
            },
          },
        },
      });

      submittedUGCs.push(updatedUGC);
    }

    // Check if all requested UGCs have been submitted
    const remainingUGCs = await this.prisma.ugc.count({
      where: {
        sessionId,
        status: UGCStatus.REQUESTED,
      },
    });

    return {
      submittedUGCs,
      allSubmitted: remainingUGCs === 0,
    };
  }

  /**
   * Validate all submitted UGCs for a session
   */
  async validateUGCs(
    sessionId: string,
    validatedBy: string,
    validationComment?: string,
  ) {
    const submittedUGCs = await this.prisma.ugc.findMany({
      where: {
        sessionId,
        status: UGCStatus.SUBMITTED,
      },
    });

    if (submittedUGCs.length === 0) {
      throw new BadRequestException('No submitted UGCs found for this session');
    }

    const validatedUGCs = await Promise.all(
      submittedUGCs.map((ugc) =>
        this.prisma.ugc.update({
          where: { id: ugc.id },
          data: {
            status: UGCStatus.VALIDATED,
            validatedAt: new Date(),
            validatedBy,
            validationComment,
          },
          include: {
            requester: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                companyName: true,
              },
            },
            submitter: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                avatar: true,
              },
            },
          },
        }),
      ),
    );

    return validatedUGCs;
  }

  /**
   * Reject all submitted UGCs for a session
   */
  async rejectUGCs(
    sessionId: string,
    rejectionReason: string,
  ) {
    const submittedUGCs = await this.prisma.ugc.findMany({
      where: {
        sessionId,
        status: UGCStatus.SUBMITTED,
      },
    });

    if (submittedUGCs.length === 0) {
      throw new BadRequestException('No submitted UGCs found for this session');
    }

    const rejectedUGCs = await Promise.all(
      submittedUGCs.map((ugc) =>
        this.prisma.ugc.update({
          where: { id: ugc.id },
          data: {
            status: UGCStatus.REJECTED,
            rejectedAt: new Date(),
            rejectionReason,
          },
          include: {
            requester: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                companyName: true,
              },
            },
            submitter: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                avatar: true,
              },
            },
          },
        }),
      ),
    );

    return rejectedUGCs;
  }

  /**
   * Decline all requested UGCs for a session
   */
  async declineUGCs(
    sessionId: string,
    declineReason: string,
  ) {
    const requestedUGCs = await this.prisma.ugc.findMany({
      where: {
        sessionId,
        status: UGCStatus.REQUESTED,
      },
    });

    if (requestedUGCs.length === 0) {
      throw new BadRequestException('No requested UGCs found for this session');
    }

    const declinedUGCs = await Promise.all(
      requestedUGCs.map((ugc) =>
        this.prisma.ugc.update({
          where: { id: ugc.id },
          data: {
            status: UGCStatus.DECLINED,
            declinedAt: new Date(),
            declineReason,
            paidBonus: 0, // No bonus paid when declined
          },
          include: {
            requester: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                companyName: true,
              },
            },
          },
        }),
      ),
    );

    return declinedUGCs;
  }

  /**
   * Get all UGCs for a session with statistics
   */
  async getSessionUGCs(sessionId: string): Promise<UGCListResponseDto> {
    const ugcs = await this.prisma.ugc.findMany({
      where: { sessionId },
      include: {
        requester: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            companyName: true,
          },
        },
        submitter: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            avatar: true,
          },
        },
        transactions: {
          select: {
            id: true,
            type: true,
            amount: true,
            status: true,
            createdAt: true,
          },
        },
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    const stats = {
      total: ugcs.length,
      requested: ugcs.filter((u) => u.status === UGCStatus.REQUESTED).length,
      submitted: ugcs.filter((u) => u.status === UGCStatus.SUBMITTED).length,
      validated: ugcs.filter((u) => u.status === UGCStatus.VALIDATED).length,
      rejected: ugcs.filter((u) => u.status === UGCStatus.REJECTED).length,
      declined: ugcs.filter((u) => u.status === UGCStatus.DECLINED).length,
      totalRequestedBonus: ugcs.reduce(
        (sum, u) => sum + Number(u.requestedBonus || 0),
        0,
      ),
      totalPaidBonus: ugcs.reduce(
        (sum, u) => sum + Number(u.paidBonus || 0),
        0,
      ),
    };

    return {
      ugcs: ugcs as any,
      ...stats,
    };
  }

  /**
   * Get all validated UGCs for a session (for payment calculation)
   */
  async getValidatedUGCsForSession(sessionId: string) {
    return this.prisma.ugc.findMany({
      where: {
        sessionId,
        status: UGCStatus.VALIDATED,
      },
      include: {
        submitter: {
          select: {
            id: true,
            stripeAccountId: true,
          },
        },
      },
    });
  }

  /**
   * Update UGC with paid bonus amount after payment
   */
  async updateUGCPaidBonus(ugcId: string, paidBonus: number) {
    return this.prisma.ugc.update({
      where: { id: ugcId },
      data: {
        paidBonus,
      },
    });
  }

  /**
   * Get UGC by ID
   */
  async getUGCById(ugcId: string) {
    const ugc = await this.prisma.ugc.findUnique({
      where: { id: ugcId },
      include: {
        requester: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            companyName: true,
          },
        },
        submitter: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            avatar: true,
          },
        },
        session: {
          select: {
            id: true,
            campaign: {
              select: {
                id: true,
                title: true,
              },
            },
          },
        },
        chatOrder: {
          select: {
            id: true,
            description: true,
          },
        },
        transactions: true,
      },
    });

    if (!ugc) {
      throw new NotFoundException('UGC not found');
    }

    return ugc;
  }

  /**
   * Calculate total bonus for validated UGCs
   */
  calculateTotalValidatedBonus(ugcs: Array<{ requestedBonus: any }>): number {
    return ugcs.reduce((sum, ugc) => sum + Number(ugc.requestedBonus || 0), 0);
  }

  /**
   * Calculer le pricing UGC selon le type et la config
   * Le PRO paie: Prix base + Commission Super_Try
   * Le créateur reçoit: Prix base (100% du prix)
   */
  calculateUgcPricing(type: 'photo' | 'video'): UgcPricingDto {
    const feeType = this.configService.get<string>('stripe.ugcFeeType', 'FIXED');

    // Prix de base selon le type
    const basePrice = type === 'photo'
      ? this.configService.get<number>('stripe.ugcPhotoPrice', 50)
      : this.configService.get<number>('stripe.ugcVideoPrice', 150);

    let commission = 0;

    if (feeType === 'FIXED') {
      // Commission fixe selon le type
      commission = type === 'photo'
        ? this.configService.get<number>('stripe.ugcPhotoFee', 10)
        : this.configService.get<number>('stripe.ugcVideoFee', 20);
    } else {
      // PERCENTAGE: Commission en % du prix base
      const feePercentage = this.configService.get<number>('stripe.ugcFeePercentage', 10);
      commission = (basePrice * feePercentage) / 100;
    }

    return {
      type,
      basePrice,
      commission,
      totalPrice: basePrice + commission,
      feeType,
      currency: 'EUR',
    };
  }

  /**
   * Obtenir les prix de tous les types UGC
   */
  getAllUgcPricing(): { photo: UgcPricingDto; video: UgcPricingDto } {
    return {
      photo: this.calculateUgcPricing('photo'),
      video: this.calculateUgcPricing('video'),
    };
  }
}
