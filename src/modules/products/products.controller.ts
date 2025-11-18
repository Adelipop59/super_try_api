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
  ForbiddenException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ProductFilterDto } from './dto/product-filter.dto';
import { ProductResponseDto } from './dto/product-response.dto';
import { SupabaseAuthGuard } from '../../common/guards/supabase-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';

@ApiTags('products')
@Controller('products')
@UseGuards(SupabaseAuthGuard, RolesGuard)
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Roles('PRO', 'ADMIN')
  @Post()
  @ApiBearerAuth('supabase-auth')
  @ApiOperation({
    summary: 'Créer un produit (PRO et ADMIN uniquement)',
    description:
      'Permet aux vendeurs (PRO) et admins de créer un nouveau produit',
  })
  @ApiResponse({
    status: 201,
    description: 'Produit créé avec succès',
    type: ProductResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Données invalides' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Rôle PRO ou ADMIN requis' })
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() createProductDto: CreateProductDto,
  ): Promise<ProductResponseDto> {
    return this.productsService.create(user.id, createProductDto);
  }

  @Roles('ADMIN')
  @Get('all')
  @ApiBearerAuth('supabase-auth')
  @ApiOperation({
    summary: 'Liste de tous les produits (Admin)',
    description:
      'Récupère tous les produits (actifs et inactifs) avec filtres optionnels',
  })
  @ApiQuery({
    name: 'sellerId',
    required: false,
    description: 'Filtrer par vendeur',
  })
  @ApiQuery({
    name: 'category',
    required: false,
    description: 'Filtrer par catégorie',
  })
  @ApiQuery({
    name: 'isActive',
    required: false,
    type: Boolean,
    description: 'Filtrer par statut actif',
  })
  @ApiResponse({
    status: 200,
    description: 'Liste de tous les produits',
    type: [ProductResponseDto],
  })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Rôle admin requis' })
  findAllAdmin(
    @Query() filters: ProductFilterDto,
  ): Promise<ProductResponseDto[]> {
    return this.productsService.findAll(filters);
  }

  @Roles('PRO', 'ADMIN')
  @Get('my-products')
  @ApiBearerAuth('supabase-auth')
  @ApiOperation({
    summary: 'Mes produits',
    description: 'Récupère la liste de mes produits (vendeur connecté)',
  })
  @ApiResponse({
    status: 200,
    description: 'Liste de mes produits',
    type: [ProductResponseDto],
  })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Rôle PRO ou ADMIN requis' })
  findMyProducts(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<ProductResponseDto[]> {
    return this.productsService.findBySeller(user.id);
  }

  @Roles('PRO', 'ADMIN')
  @Get(':id')
  @ApiBearerAuth('supabase-auth')
  @ApiOperation({
    summary: "Détails d'un produit",
    description:
      "Récupère les détails d'un produit (propriétaire uniquement ou ADMIN)",
  })
  @ApiParam({ name: 'id', description: 'ID du produit' })
  @ApiResponse({
    status: 200,
    description: 'Détails du produit',
    type: ProductResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({
    status: 403,
    description: 'Vous ne pouvez consulter que vos propres produits',
  })
  @ApiResponse({ status: 404, description: 'Produit non trouvé' })
  async findOne(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<ProductResponseDto> {
    const product = await this.productsService.findOne(id);

    // Sellers can only view their own products unless they're admin
    if (user.role !== 'ADMIN' && product.sellerId !== user.id) {
      throw new ForbiddenException(
        'You can only view your own products',
      );
    }

    return product;
  }

  @Roles('PRO', 'ADMIN')
  @Patch(':id')
  @ApiBearerAuth('supabase-auth')
  @ApiOperation({
    summary: 'Modifier un produit',
    description: 'Modifie un produit (propriétaire uniquement ou ADMIN)',
  })
  @ApiParam({ name: 'id', description: 'ID du produit' })
  @ApiResponse({
    status: 200,
    description: 'Produit modifié avec succès',
    type: ProductResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Données invalides' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({
    status: 403,
    description: 'Vous ne pouvez modifier que vos propres produits',
  })
  @ApiResponse({ status: 404, description: 'Produit non trouvé' })
  update(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() updateProductDto: UpdateProductDto,
  ): Promise<ProductResponseDto> {
    const isAdmin = user.role === 'ADMIN';
    return this.productsService.update(id, user.id, updateProductDto, isAdmin);
  }

  @Roles('PRO', 'ADMIN')
  @Delete(':id')
  @ApiBearerAuth('supabase-auth')
  @ApiOperation({
    summary: 'Désactiver un produit',
    description:
      'Désactive un produit (propriétaire uniquement ou ADMIN) - soft delete',
  })
  @ApiParam({ name: 'id', description: 'ID du produit' })
  @ApiResponse({ status: 200, description: 'Produit désactivé avec succès' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({
    status: 403,
    description: 'Vous ne pouvez supprimer que vos propres produits',
  })
  @ApiResponse({ status: 404, description: 'Produit non trouvé' })
  remove(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<{ message: string }> {
    const isAdmin = user.role === 'ADMIN';
    return this.productsService.remove(id, user.id, isAdmin);
  }

  @Roles('PRO', 'ADMIN')
  @Patch(':id/activate')
  @ApiBearerAuth('supabase-auth')
  @ApiOperation({
    summary: 'Activer un produit',
    description:
      'Active un produit désactivé (propriétaire uniquement ou ADMIN)',
  })
  @ApiParam({ name: 'id', description: 'ID du produit' })
  @ApiResponse({
    status: 200,
    description: 'Produit activé avec succès',
    type: ProductResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({
    status: 403,
    description: 'Vous ne pouvez activer que vos propres produits',
  })
  @ApiResponse({ status: 404, description: 'Produit non trouvé' })
  activate(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<ProductResponseDto> {
    const isAdmin = user.role === 'ADMIN';
    return this.productsService.activate(id, user.id, isAdmin);
  }

  @Roles('ADMIN')
  @Patch(':id/toggle-active')
  @ApiBearerAuth('supabase-auth')
  @ApiOperation({
    summary: 'Activer/Désactiver produit (Admin)',
    description: "Change le statut actif d'un produit (ADMIN uniquement)",
  })
  @ApiParam({ name: 'id', description: 'ID du produit' })
  @ApiResponse({
    status: 200,
    description: 'Statut modifié avec succès',
    type: ProductResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Rôle admin requis' })
  @ApiResponse({ status: 404, description: 'Produit non trouvé' })
  toggleActive(@Param('id') id: string): Promise<ProductResponseDto> {
    return this.productsService.toggleActive(id);
  }
}
