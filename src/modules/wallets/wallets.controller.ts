import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Query,
  Param,
  UseGuards,
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
  ApiParam,
  ApiBody,
} from '@nestjs/swagger';
import { WalletsService } from './wallets.service';
import { WalletResponseDto } from './dto/wallet-response.dto';
import { TransactionResponseDto } from './dto/transaction-response.dto';
import { WithdrawalResponseDto } from './dto/withdrawal-response.dto';
import { CreateWithdrawalDto } from './dto/create-withdrawal.dto';
import { SupabaseAuthGuard } from '../../common/guards/supabase-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import {
  CurrentUser,
  AuthenticatedUser,
} from '../../common/decorators/current-user.decorator';

@ApiTags('Wallets')
@ApiBearerAuth()
@Controller('wallets')
@UseGuards(SupabaseAuthGuard, RolesGuard)
export class WalletsController {
  constructor(private readonly walletsService: WalletsService) {}

  @Get('me')
  @ApiOperation({
    summary: 'Récupérer mon wallet',
    description:
      'Récupère le wallet de l\'utilisateur authentifié. Crée le wallet s\'il n\'existe pas.',
  })
  @ApiResponse({
    status: 200,
    description: 'Wallet récupéré avec succès',
    type: WalletResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Non authentifié',
  })
  @ApiResponse({
    status: 404,
    description: 'Utilisateur non trouvé',
  })
  async getMyWallet(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<WalletResponseDto> {
    return this.walletsService.getOrCreateWallet(user.id);
  }

  @Get('me/balance')
  @ApiOperation({
    summary: 'Récupérer mon solde',
    description: 'Récupère uniquement le solde du wallet de l\'utilisateur.',
  })
  @ApiResponse({
    status: 200,
    description: 'Solde récupéré avec succès',
    schema: {
      type: 'object',
      properties: {
        balance: {
          type: 'number',
          example: 125.50,
        },
        currency: {
          type: 'string',
          example: 'EUR',
        },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Non authentifié',
  })
  async getMyBalance(@CurrentUser() user: AuthenticatedUser): Promise<{
    balance: number;
    currency: string;
  }> {
    const result = await this.walletsService.getWalletBalance(user.id);
    return {
      balance:
        typeof result.balance === 'number'
          ? result.balance
          : parseFloat(result.balance.toString()),
      currency: result.currency,
    };
  }

  @Get('me/transactions')
  @ApiOperation({
    summary: 'Récupérer l\'historique de mes transactions',
    description:
      'Récupère la liste paginée des transactions du wallet de l\'utilisateur.',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Nombre de transactions par page (défaut: 50)',
    example: 50,
  })
  @ApiQuery({
    name: 'offset',
    required: false,
    description: 'Décalage pour la pagination (défaut: 0)',
    example: 0,
  })
  @ApiResponse({
    status: 200,
    description: 'Historique récupéré avec succès',
    schema: {
      type: 'object',
      properties: {
        transactions: {
          type: 'array',
          items: { $ref: '#/components/schemas/TransactionResponseDto' },
        },
        total: {
          type: 'number',
          example: 150,
        },
        limit: {
          type: 'number',
          example: 50,
        },
        offset: {
          type: 'number',
          example: 0,
        },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Non authentifié',
  })
  async getMyTransactions(
    @CurrentUser() user: AuthenticatedUser,
    @Query('limit', new DefaultValuePipe(50), ParseIntPipe) limit: number,
    @Query('offset', new DefaultValuePipe(0), ParseIntPipe) offset: number,
  ): Promise<{
    transactions: TransactionResponseDto[];
    total: number;
    limit: number;
    offset: number;
  }> {
    return this.walletsService.getTransactionHistory(user.id, limit, offset);
  }

  @Get('me/transactions/:transactionId')
  @ApiOperation({
    summary: 'Récupérer une transaction spécifique',
    description: 'Récupère les détails d\'une transaction par son ID.',
  })
  @ApiParam({
    name: 'transactionId',
    description: 'ID de la transaction',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiResponse({
    status: 200,
    description: 'Transaction récupérée avec succès',
    type: TransactionResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Non authentifié',
  })
  @ApiResponse({
    status: 404,
    description: 'Transaction non trouvée',
  })
  async getTransaction(
    @CurrentUser() user: AuthenticatedUser,
    @Param('transactionId') transactionId: string,
  ): Promise<TransactionResponseDto> {
    return this.walletsService.getTransactionById(user.id, transactionId);
  }

  @Post('me/withdrawals')
  @ApiOperation({
    summary: 'Créer une demande de retrait',
    description:
      'Crée une nouvelle demande de retrait. Le montant minimum est de 10€.',
  })
  @ApiBody({
    type: CreateWithdrawalDto,
  })
  @ApiResponse({
    status: 201,
    description: 'Demande de retrait créée avec succès',
    type: WithdrawalResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Montant invalide ou solde insuffisant',
  })
  @ApiResponse({
    status: 401,
    description: 'Non authentifié',
  })
  async createWithdrawal(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateWithdrawalDto,
  ): Promise<WithdrawalResponseDto> {
    return this.walletsService.createWithdrawal(user.id, dto);
  }

  @Get('me/withdrawals')
  @ApiOperation({
    summary: 'Récupérer l\'historique de mes retraits',
    description: 'Récupère la liste paginée des demandes de retrait.',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Nombre de retraits par page (défaut: 50)',
    example: 50,
  })
  @ApiQuery({
    name: 'offset',
    required: false,
    description: 'Décalage pour la pagination (défaut: 0)',
    example: 0,
  })
  @ApiResponse({
    status: 200,
    description: 'Historique récupéré avec succès',
    schema: {
      type: 'object',
      properties: {
        withdrawals: {
          type: 'array',
          items: { $ref: '#/components/schemas/WithdrawalResponseDto' },
        },
        total: {
          type: 'number',
          example: 15,
        },
        limit: {
          type: 'number',
          example: 50,
        },
        offset: {
          type: 'number',
          example: 0,
        },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Non authentifié',
  })
  async getMyWithdrawals(
    @CurrentUser() user: AuthenticatedUser,
    @Query('limit', new DefaultValuePipe(50), ParseIntPipe) limit: number,
    @Query('offset', new DefaultValuePipe(0), ParseIntPipe) offset: number,
  ): Promise<{
    withdrawals: WithdrawalResponseDto[];
    total: number;
    limit: number;
    offset: number;
  }> {
    return this.walletsService.getWithdrawalHistory(user.id, limit, offset);
  }

  @Get('me/withdrawals/:withdrawalId')
  @ApiOperation({
    summary: 'Récupérer une demande de retrait spécifique',
    description: 'Récupère les détails d\'une demande de retrait par son ID.',
  })
  @ApiParam({
    name: 'withdrawalId',
    description: 'ID de la demande de retrait',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiResponse({
    status: 200,
    description: 'Demande de retrait récupérée avec succès',
    type: WithdrawalResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Non authentifié',
  })
  @ApiResponse({
    status: 404,
    description: 'Demande de retrait non trouvée',
  })
  async getWithdrawal(
    @CurrentUser() user: AuthenticatedUser,
    @Param('withdrawalId') withdrawalId: string,
  ): Promise<WithdrawalResponseDto> {
    return this.walletsService.getWithdrawalById(user.id, withdrawalId);
  }

  @Delete('me/withdrawals/:withdrawalId')
  @ApiOperation({
    summary: 'Annuler une demande de retrait',
    description:
      'Annule une demande de retrait en statut PENDING. Le montant est recrédité au wallet.',
  })
  @ApiParam({
    name: 'withdrawalId',
    description: 'ID de la demande de retrait',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        reason: {
          type: 'string',
          example: 'Je n\'ai plus besoin de retirer cet argent',
        },
      },
      required: ['reason'],
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Demande de retrait annulée avec succès',
    type: WithdrawalResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'La demande ne peut pas être annulée (statut invalide)',
  })
  @ApiResponse({
    status: 401,
    description: 'Non authentifié',
  })
  @ApiResponse({
    status: 404,
    description: 'Demande de retrait non trouvée',
  })
  async cancelWithdrawal(
    @CurrentUser() user: AuthenticatedUser,
    @Param('withdrawalId') withdrawalId: string,
    @Body('reason') reason: string,
  ): Promise<WithdrawalResponseDto> {
    return this.walletsService.cancelWithdrawal(
      user.id,
      withdrawalId,
      reason,
    );
  }
}
