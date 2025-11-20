import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateProcedureTemplateDto } from './dto/create-procedure-template.dto';
import { UpdateProcedureTemplateDto } from './dto/update-procedure-template.dto';
import { ProcedureTemplateResponseDto } from './dto/procedure-template-response.dto';
import { CampaignStatus } from '@prisma/client';
import {
  PaginatedResponse,
  createPaginatedResponse,
  calculateOffset,
} from '../../common/dto/pagination.dto';

@Injectable()
export class ProcedureTemplatesService {
  constructor(private prismaService: PrismaService) {}

  /**
   * Create a new procedure template
   */
  async create(
    sellerId: string,
    createDto: CreateProcedureTemplateDto,
  ): Promise<ProcedureTemplateResponseDto> {
    const { steps, ...templateData } = createDto;

    const template = await this.prismaService.procedureTemplate.create({
      data: {
        ...templateData,
        sellerId,
        steps: steps
          ? {
              create: steps.map((step) => ({
                title: step.title,
                description: step.description,
                type: step.type ?? 'TEXT',
                order: step.order,
                isRequired: step.isRequired ?? true,
                checklistItems: step.checklistItems,
              })),
            }
          : undefined,
      },
      include: {
        steps: {
          orderBy: { order: 'asc' },
        },
      },
    });

    return template;
  }

  /**
   * Find all templates for a seller with pagination
   */
  async findAllBySeller(
    sellerId: string,
    page: number = 1,
    limit: number = 20,
  ): Promise<PaginatedResponse<ProcedureTemplateResponseDto>> {
    const where = { sellerId };
    const offset = calculateOffset(page, limit);

    const [templates, total] = await Promise.all([
      this.prismaService.procedureTemplate.findMany({
        where,
        include: {
          steps: {
            orderBy: { order: 'asc' },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      this.prismaService.procedureTemplate.count({ where }),
    ]);

    return createPaginatedResponse(templates, total, page, limit);
  }

  /**
   * Find template by ID
   */
  async findOne(
    id: string,
    sellerId: string,
  ): Promise<ProcedureTemplateResponseDto> {
    const template = await this.prismaService.procedureTemplate.findUnique({
      where: { id },
      include: {
        steps: {
          orderBy: { order: 'asc' },
        },
      },
    });

    if (!template) {
      throw new NotFoundException(`Template with ID ${id} not found`);
    }

    if (template.sellerId !== sellerId) {
      throw new ForbiddenException('You can only access your own templates');
    }

    return template;
  }

  /**
   * Update a template
   */
  async update(
    id: string,
    sellerId: string,
    updateDto: UpdateProcedureTemplateDto,
  ): Promise<ProcedureTemplateResponseDto> {
    const template = await this.prismaService.procedureTemplate.findUnique({
      where: { id },
    });

    if (!template) {
      throw new NotFoundException(`Template with ID ${id} not found`);
    }

    if (template.sellerId !== sellerId) {
      throw new ForbiddenException('You can only update your own templates');
    }

    const { steps, ...templateData } = updateDto;

    // If steps are provided, delete existing and create new ones
    if (steps) {
      await this.prismaService.stepTemplate.deleteMany({
        where: { procedureTemplateId: id },
      });
    }

    const updatedTemplate = await this.prismaService.procedureTemplate.update({
      where: { id },
      data: {
        ...templateData,
        steps: steps
          ? {
              create: steps.map((step) => ({
                title: step.title,
                description: step.description,
                type: step.type ?? 'TEXT',
                order: step.order,
                isRequired: step.isRequired ?? true,
                checklistItems: step.checklistItems,
              })),
            }
          : undefined,
      },
      include: {
        steps: {
          orderBy: { order: 'asc' },
        },
      },
    });

    return updatedTemplate;
  }

  /**
   * Delete a template
   */
  async remove(id: string, sellerId: string): Promise<{ message: string }> {
    const template = await this.prismaService.procedureTemplate.findUnique({
      where: { id },
    });

    if (!template) {
      throw new NotFoundException(`Template with ID ${id} not found`);
    }

    if (template.sellerId !== sellerId) {
      throw new ForbiddenException('You can only delete your own templates');
    }

    await this.prismaService.procedureTemplate.delete({
      where: { id },
    });

    return { message: 'Template deleted successfully' };
  }

  /**
   * Copy a template to a campaign as a procedure
   */
  async copyToCampaign(
    templateId: string,
    campaignId: string,
    sellerId: string,
    order: number,
  ): Promise<any> {
    // Get the template with steps
    const template = await this.prismaService.procedureTemplate.findUnique({
      where: { id: templateId },
      include: {
        steps: {
          orderBy: { order: 'asc' },
        },
      },
    });

    if (!template) {
      throw new NotFoundException(`Template with ID ${templateId} not found`);
    }

    if (template.sellerId !== sellerId) {
      throw new ForbiddenException('You can only use your own templates');
    }

    // Check campaign exists and belongs to seller
    const campaign = await this.prismaService.campaign.findUnique({
      where: { id: campaignId },
    });

    if (!campaign) {
      throw new NotFoundException(`Campaign with ID ${campaignId} not found`);
    }

    if (campaign.sellerId !== sellerId) {
      throw new ForbiddenException(
        'You can only add procedures to your own campaigns',
      );
    }

    // Check campaign is in DRAFT status
    if (campaign.status !== CampaignStatus.DRAFT) {
      throw new BadRequestException(
        'Can only add procedures to DRAFT campaigns',
      );
    }

    // Create the procedure from template
    const procedure = await this.prismaService.procedure.create({
      data: {
        campaignId,
        title: template.title,
        description: template.description,
        order,
        isRequired: true,
        steps: {
          create: template.steps.map((step) => ({
            title: step.title,
            description: step.description,
            type: step.type,
            order: step.order,
            isRequired: step.isRequired,
            checklistItems: step.checklistItems ?? undefined,
          })),
        },
      },
      include: {
        steps: {
          orderBy: { order: 'asc' },
        },
      },
    });

    return procedure;
  }
}
