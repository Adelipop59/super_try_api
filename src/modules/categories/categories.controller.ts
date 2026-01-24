import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Query,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { CategoriesService } from './categories.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { CategoryFilterDto } from './dto/category-filter.dto';
import { CategoryResponseDto } from './dto/category-response.dto';
import { SupabaseAuthGuard } from '../../common/guards/supabase-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Public } from '../../common/decorators/public.decorator';

@ApiTags('categories')
@Controller('categories')
@UseGuards(SupabaseAuthGuard, RolesGuard)
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Roles('ADMIN')
  @Post()
  @ApiBearerAuth('supabase-auth')
  @ApiOperation({
    summary: 'Créer une catégorie (ADMIN uniquement)',
    description:
      'Permet aux admins de créer une nouvelle catégorie de produits',
  })
  @ApiResponse({
    status: 201,
    description: 'Catégorie créée avec succès',
    type: CategoryResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Données invalides' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Rôle ADMIN requis' })
  @ApiResponse({ status: 409, description: 'Catégorie existe déjà' })
  create(
    @Body() createCategoryDto: CreateCategoryDto,
  ): Promise<CategoryResponseDto> {
    return this.categoriesService.create(createCategoryDto);
  }

  @Public()
  @Get()
  @ApiOperation({
    summary: 'Liste des catégories',
    description: 'Récupère toutes les catégories avec filtres optionnels',
  })
  @ApiResponse({
    status: 200,
    description: 'Liste des catégories',
    type: [CategoryResponseDto],
  })
  findAll(@Query() filters: CategoryFilterDto): Promise<CategoryResponseDto[]> {
    return this.categoriesService.findAll(filters);
  }

  @Public()
  @Get('slug/:slug')
  @ApiOperation({
    summary: 'Catégorie par slug',
    description: 'Récupère une catégorie par son slug',
  })
  @ApiParam({
    name: 'slug',
    description: 'Slug de la catégorie',
    example: 'electronique',
  })
  @ApiResponse({
    status: 200,
    description: 'Catégorie trouvée',
    type: CategoryResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Catégorie non trouvée' })
  findBySlug(@Param('slug') slug: string): Promise<CategoryResponseDto> {
    return this.categoriesService.findBySlug(slug);
  }

  @Public()
  @Get(':id')
  @ApiOperation({
    summary: 'Catégorie par ID',
    description: 'Récupère une catégorie par son ID',
  })
  @ApiParam({
    name: 'id',
    description: 'ID de la catégorie',
  })
  @ApiResponse({
    status: 200,
    description: 'Catégorie trouvée',
    type: CategoryResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Catégorie non trouvée' })
  findOne(@Param('id') id: string): Promise<CategoryResponseDto> {
    return this.categoriesService.findOne(id);
  }

  @Roles('ADMIN')
  @Patch(':id')
  @ApiBearerAuth('supabase-auth')
  @ApiOperation({
    summary: 'Modifier une catégorie (ADMIN uniquement)',
    description: 'Met à jour une catégorie existante',
  })
  @ApiParam({ name: 'id', description: 'ID de la catégorie' })
  @ApiResponse({
    status: 200,
    description: 'Catégorie mise à jour',
    type: CategoryResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Données invalides' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Rôle ADMIN requis' })
  @ApiResponse({ status: 404, description: 'Catégorie non trouvée' })
  @ApiResponse({ status: 409, description: 'Conflit de nom ou slug' })
  update(
    @Param('id') id: string,
    @Body() updateCategoryDto: UpdateCategoryDto,
  ): Promise<CategoryResponseDto> {
    return this.categoriesService.update(id, updateCategoryDto);
  }

  @Roles('ADMIN')
  @Patch(':id/toggle-active')
  @ApiBearerAuth('supabase-auth')
  @ApiOperation({
    summary: 'Activer/Désactiver une catégorie (ADMIN uniquement)',
    description: "Change le statut actif d'une catégorie",
  })
  @ApiParam({ name: 'id', description: 'ID de la catégorie' })
  @ApiResponse({
    status: 200,
    description: 'Statut modifié avec succès',
    type: CategoryResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Rôle ADMIN requis' })
  @ApiResponse({ status: 404, description: 'Catégorie non trouvée' })
  toggleActive(@Param('id') id: string): Promise<CategoryResponseDto> {
    return this.categoriesService.toggleActive(id);
  }

  @Roles('ADMIN')
  @Delete(':id')
  @ApiBearerAuth('supabase-auth')
  @ApiOperation({
    summary: 'Supprimer une catégorie (ADMIN uniquement)',
    description:
      'Supprime une catégorie (impossible si elle contient des produits)',
  })
  @ApiParam({ name: 'id', description: 'ID de la catégorie' })
  @ApiResponse({ status: 200, description: 'Catégorie supprimée' })
  @ApiResponse({
    status: 400,
    description: 'Catégorie contient des produits',
  })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Rôle ADMIN requis' })
  @ApiResponse({ status: 404, description: 'Catégorie non trouvée' })
  remove(@Param('id') id: string): Promise<{ message: string }> {
    return this.categoriesService.remove(id);
  }
}
