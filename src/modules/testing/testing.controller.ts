import { Controller, Post, Get, Delete, Param, Body } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
} from '@nestjs/swagger';
import { Public } from '../../common/decorators/public.decorator';
import { PrismaService } from '../../database/prisma.service';
import { LogsService } from '../logs/logs.service';
import { LogCategory, StepType, DistributionType } from '@prisma/client';
import { ApiTesterService } from './api-tester.service';
import { ApiTesterV2Service } from './api-tester-v2.service';

@ApiTags('test_api')
@Controller('test')
@Public() // Tous les endpoints de test sont publics
export class TestingController {
  constructor(
    private prismaService: PrismaService,
    private logsService: LogsService,
    private apiTesterService: ApiTesterService,
    private apiTesterV2Service: ApiTesterV2Service,
  ) {}

  // ==================== TEST DISTRIBUTIONS ====================

  @Post('distributions/create-week')
  @ApiOperation({
    summary: '[TEST] Créer une semaine complète de distribution',
    description:
      'Crée automatiquement une distribution pour chaque jour de la semaine avec des valeurs de test.',
  })
  @ApiResponse({
    status: 201,
    description: 'Distributions de la semaine créées',
  })
  async createSampleWeek(@Body() body: { campaignId: string }) {
    const distributions = await Promise.all([
      // Lundi
      this.prismaService.distribution.create({
        data: {
          campaignId: body.campaignId,
          type: DistributionType.RECURRING,
          dayOfWeek: 1,
          isActive: true,
        },
      }),
      // Mardi
      this.prismaService.distribution.create({
        data: {
          campaignId: body.campaignId,
          type: DistributionType.RECURRING,
          dayOfWeek: 2,
          isActive: true,
        },
      }),
      // Mercredi
      this.prismaService.distribution.create({
        data: {
          campaignId: body.campaignId,
          type: DistributionType.RECURRING,
          dayOfWeek: 3,
          isActive: true,
        },
      }),
      // Jeudi
      this.prismaService.distribution.create({
        data: {
          campaignId: body.campaignId,
          type: DistributionType.RECURRING,
          dayOfWeek: 4,
          isActive: true,
        },
      }),
      // Vendredi
      this.prismaService.distribution.create({
        data: {
          campaignId: body.campaignId,
          type: DistributionType.RECURRING,
          dayOfWeek: 5,
          isActive: true,
        },
      }),
    ]);

    await this.logsService.logSuccess(
      LogCategory.TEST,
      `✅ [TEST] Semaine complète de distribution créée (${distributions.length} jours)`,
      { campaignId: body.campaignId, count: distributions.length },
    );

    return {
      success: true,
      message: `Semaine complète créée: ${distributions.length} distribution(s)`,
      data: distributions,
    };
  }

  @Get('distributions/list-all')
  @ApiOperation({
    summary: '[TEST] Lister toutes les distributions',
    description: 'Retourne toutes les distributions de la base de données.',
  })
  @ApiResponse({ status: 200, description: 'Liste des distributions' })
  async listAllDistributions() {
    const distributions =
      await this.prismaService.distribution.findMany({
        include: { campaign: true },
        orderBy: { createdAt: 'desc' },
      });

    await this.logsService.logInfo(
      LogCategory.TEST,
      `🔵 [TEST] ${distributions.length} distribution(s) listée(s)`,
      { count: distributions.length },
    );

    return {
      success: true,
      message: `${distributions.length} distribution(s) trouvée(s)`,
      data: distributions,
    };
  }

  @Delete('distributions/cleanup')
  @ApiOperation({
    summary: '[TEST] Supprimer toutes les distributions',
    description: 'ATTENTION: Supprime TOUTES les distributions.',
  })
  @ApiResponse({ status: 200, description: 'Distributions supprimées' })
  async cleanupDistributions() {
    const count = await this.prismaService.distribution.count();
    await this.prismaService.distribution.deleteMany({});

    await this.logsService.logWarning(
      LogCategory.TEST,
      `⚠️ [TEST] ${count} distribution(s) supprimée(s)`,
      { count },
    );

    return {
      success: true,
      message: `${count} distribution(s) supprimée(s) avec succès`,
      count,
    };
  }

  // ==================== API AUTOMATED TESTS ====================

  @Post('run-api-tests')
  @ApiOperation({
    summary: '[TEST_API] Exécuter tous les tests API automatisés (ANCIENNE VERSION - 31 endpoints)',
    description:
      'Exécute une suite complète de tests automatisés pour valider tous les endpoints de l\'API. ' +
      'Teste l\'authentification, les permissions, les modules métier (users, products, campaigns, procedures, steps, distributions, logs). ' +
      'Retourne un rapport détaillé avec le nombre de tests réussis/échoués et les logs de chaque test.',
  })
  @ApiResponse({
    status: 200,
    description: 'Tests API exécutés avec succès',
    schema: {
      type: 'object',
      properties: {
        success: {
          type: 'boolean',
          example: true,
          description: 'Tous les tests ont réussi',
        },
        duration: {
          type: 'string',
          example: '15.3s',
          description: 'Durée totale d\'exécution',
        },
        summary: {
          type: 'object',
          properties: {
            total: { type: 'number', example: 45 },
            passed: { type: 'number', example: 43 },
            failed: { type: 'number', example: 2 },
          },
        },
        results: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              module: { type: 'string', example: 'auth' },
              endpoint: { type: 'string', example: 'POST /auth/signup' },
              method: { type: 'string', example: 'POST' },
              status: { type: 'string', example: 'passed' },
              statusCode: { type: 'number', example: 201 },
              duration: { type: 'number', example: 234 },
              error: { type: 'string', example: 'Error message if failed' },
            },
          },
        },
      },
    },
  })
  async runApiTests() {
    return this.apiTesterService.runApiTests();
  }

  // ==================== NEW MODULAR API TESTS V2 ====================

  @Post('v2/test-phase-1-auth')
  @ApiOperation({
    summary: '[TEST_API_V2] Phase 1: Auth Module (13 endpoints)',
    description: 'Teste tous les endpoints d\'authentification: signup, login, logout, refresh, verify, password reset, OAuth',
  })
  @ApiResponse({ status: 200, description: 'Tests Phase 1 terminés' })
  async testPhase1Auth(@Body() context?: any) {
    return this.apiTesterV2Service.testPhase1Auth(context || {});
  }

  @Post('v2/test-phase-2-users')
  @ApiOperation({
    summary: '[TEST_API_V2] Phase 2: Users Module (8 endpoints)',
    description: 'Teste la gestion des utilisateurs: profiles, roles, verification, suspension',
  })
  @ApiResponse({ status: 200, description: 'Tests Phase 2 terminés' })
  async testPhase2Users(@Body() context: any) {
    return this.apiTesterV2Service.testPhase2Users(context);
  }

  @Post('v2/test-phase-3-business')
  @ApiOperation({
    summary: '[TEST_API_V2] Phase 3: Core Business (38 endpoints)',
    description: 'Teste products, campaigns, procedures, steps, distributions',
  })
  @ApiResponse({ status: 200, description: 'Tests Phase 3 terminés' })
  async testPhase3Business(@Body() context: any) {
    return this.apiTesterV2Service.testPhase3Business(context);
  }

  @Post('v2/test-phase-4-sessions')
  @ApiOperation({
    summary: '[TEST_API_V2] Phase 4: Testing Sessions (11 endpoints)',
    description: 'Teste le workflow complet: apply, accept, purchase, submit, validate, dispute',
  })
  @ApiResponse({ status: 200, description: 'Tests Phase 4 terminés' })
  async testPhase4Sessions(@Body() context: any) {
    return this.apiTesterV2Service.testPhase4Sessions(context);
  }

  @Post('v2/test-phase-5-communication')
  @ApiOperation({
    summary: '[TEST_API_V2] Phase 5: Communication (15 endpoints)',
    description: 'Teste messages et notifications',
  })
  @ApiResponse({ status: 200, description: 'Tests Phase 5 terminés' })
  async testPhase5Communication(@Body() context: any) {
    return this.apiTesterV2Service.testPhase5Communication(context);
  }

  @Post('v2/test-phase-6-admin')
  @ApiOperation({
    summary: '[TEST_API_V2] Phase 6: Admin & Monitoring (39 endpoints)',
    description: 'Teste logs et admin panel',
  })
  @ApiResponse({ status: 200, description: 'Tests Phase 6 terminés' })
  async testPhase6Admin(@Body() context: any) {
    return this.apiTesterV2Service.testPhase6Admin(context);
  }

  @Post('v2/run-complete-tests')
  @ApiOperation({
    summary: '[TEST_API_V2] ORCHESTRATEUR - Exécute TOUS les tests (122 endpoints)',
    description:
      'Exécute toutes les 6 phases en séquence avec logging détaillé JSON. ' +
      'Teste les 122 endpoints métier avec 3 rôles (USER, PRO, ADMIN). ' +
      'Génère un rapport JSON complet et nettoie automatiquement toutes les données TEST_API_. ' +
      'Durée estimée: 3-5 minutes.',
  })
  @ApiResponse({
    status: 200,
    description: 'Tests complets terminés avec rapport JSON détaillé',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        duration: { type: 'string', example: '3m 45s' },
        timestamp: { type: 'string', example: '2025-01-12T10:35:00.000Z' },
        summary: {
          type: 'object',
          properties: {
            totalEndpoints: { type: 'number', example: 122 },
            tested: { type: 'number', example: 122 },
            passed: { type: 'number', example: 120 },
            failed: { type: 'number', example: 2 },
            skipped: { type: 'number', example: 0 },
          },
        },
        phases: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              phase: { type: 'string', example: 'PHASE_1_AUTH' },
              endpoints: { type: 'number', example: 13 },
              passed: { type: 'number', example: 13 },
              failed: { type: 'number', example: 0 },
              duration: { type: 'string', example: '5.2s' },
            },
          },
        },
        byModule: {
          type: 'object',
          example: {
            auth: { total: 13, passed: 13, failed: 0, skipped: 0 },
            users: { total: 8, passed: 8, failed: 0, skipped: 0 },
          },
        },
        failures: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              endpoint: { type: 'string', example: 'POST /sessions/apply' },
              method: { type: 'string', example: 'POST' },
              error: { type: 'string', example: 'Campaign not active' },
            },
          },
        },
        detailedLogs: {
          type: 'array',
          description: 'Logs détaillés de chaque requête/réponse',
        },
        cleanup: {
          type: 'object',
          properties: {
            profiles: { type: 'number', example: 5 },
            campaigns: { type: 'number', example: 3 },
            sessions: { type: 'number', example: 2 },
            total: { type: 'number', example: 87 },
          },
        },
      },
    },
  })
  async runCompleteTestsV2() {
    return this.apiTesterV2Service.runCompleteApiTests();
  }

  // ==================== RUN ALL TESTS ====================

  @Post('run-all-tests')
  @ApiOperation({
    summary:
      '[TEST] Exécuter TOUS les tests séquentiellement - Scénario complet',
    description:
      'Crée un scénario de test complet : campagne → procédure → étapes → distributions. Retourne tous les IDs créés pour référence.',
  })
  @ApiResponse({
    status: 201,
    description: 'Scénario de test complet créé avec succès',
  })
  async runAllTests(@Body() body?: { sellerId?: string }) {
    await this.logsService.logInfo(
      LogCategory.TEST,
      `🔵 [TEST] Début du scénario de test complet`,
      {},
    );

    try {
      // 0. Créer un profil de test seller automatiquement
      const testProfile = await this.prismaService.profile.create({
        data: {
          supabaseUserId: `TEST_API_supabase-${Date.now()}`,
          email: `TEST_API_seller-${Date.now()}@supertry.test`,
          role: 'PRO',
          firstName: 'TEST_API_First',
          lastName: 'TEST_API_Last',
          companyName: 'TEST_API_Company Auto',
          isActive: true,
          isVerified: true,
        },
      });

      await this.logsService.logSuccess(
        LogCategory.TEST,
        `✅ [TEST] Profil de test créé: ${testProfile.email}`,
        { profileId: testProfile.id },
      );

      // 1. Créer une campagne de test
      const campaign = await this.prismaService.campaign.create({
        data: {
          sellerId: testProfile.id,
          title: 'TEST_API_Campagne de test automatique',
          description:
            'TEST_API_Campagne créée automatiquement pour tester le système complet',
          startDate: new Date(),
          endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 jours
          totalSlots: 25,
          availableSlots: 25,
          status: 'ACTIVE',
        },
      });

      await this.logsService.logSuccess(
        LogCategory.TEST,
        `✅ [TEST] Campagne créée: ${campaign.title}`,
        { campaignId: campaign.id },
      );

      // 2. Créer une procédure de test
      const procedure = await this.prismaService.procedure.create({
        data: {
          campaignId: campaign.id,
          title: 'TEST_API_Procédure de déballage et vérification',
          description:
            'TEST_API_Procédure complète pour tester le déballage et la première utilisation du produit',
          order: 1,
          isRequired: true,
        },
      });

      await this.logsService.logSuccess(
        LogCategory.TEST,
        `✅ [TEST] Procédure créée: ${procedure.title}`,
        { procedureId: procedure.id },
      );

      // 3. Créer toutes les étapes de test
      const steps = await Promise.all([
        this.prismaService.step.create({
          data: {
            procedureId: procedure.id,
            title: 'TEST_API_Inspection de l\'emballage',
            description:
              'TEST_API_Inspectez l\'emballage extérieur et vérifiez qu\'il n\'y a aucun dommage',
            type: StepType.TEXT,
            order: 1,
            isRequired: true,
          },
        }),
        this.prismaService.step.create({
          data: {
            procedureId: procedure.id,
            title: 'TEST_API_Photo de l\'emballage fermé',
            description:
              'TEST_API_Prenez une photo de l\'emballage sous tous les angles',
            type: StepType.PHOTO,
            order: 2,
            isRequired: true,
          },
        }),
        this.prismaService.step.create({
          data: {
            procedureId: procedure.id,
            title: 'TEST_API_Ouverture et déballage',
            description:
              'TEST_API_Ouvrez délicatement l\'emballage et déballez le produit',
            type: StepType.TEXT,
            order: 3,
            isRequired: true,
          },
        }),
        this.prismaService.step.create({
          data: {
            procedureId: procedure.id,
            title: 'TEST_API_Vérification du contenu',
            description: 'TEST_API_Vérifiez que tous les éléments sont présents',
            type: StepType.CHECKLIST,
            order: 4,
            isRequired: true,
            checklistItems: [
              'TEST_API_Produit principal présent et intact',
              'TEST_API_Notice d\'utilisation incluse et lisible',
              'TEST_API_Accessoires complets selon la liste',
              'TEST_API_Aucun dommage visible sur le produit',
              'TEST_API_Câbles et connecteurs en bon état',
            ],
          },
        }),
        this.prismaService.step.create({
          data: {
            procedureId: procedure.id,
            title: 'TEST_API_Photo du contenu complet',
            description: 'TEST_API_Prenez une photo de tous les éléments déballés',
            type: StepType.PHOTO,
            order: 5,
            isRequired: true,
          },
        }),
        this.prismaService.step.create({
          data: {
            procedureId: procedure.id,
            title: 'TEST_API_Vidéo de déballage (optionnel)',
            description:
              'TEST_API_Si possible, filmez le processus complet de déballage',
            type: StepType.VIDEO,
            order: 6,
            isRequired: false,
          },
        }),
        this.prismaService.step.create({
          data: {
            procedureId: procedure.id,
            title: 'TEST_API_Évaluation globale',
            description: 'TEST_API_Notez votre première impression du produit',
            type: StepType.RATING,
            order: 7,
            isRequired: true,
          },
        }),
      ]);

      await this.logsService.logSuccess(
        LogCategory.TEST,
        `✅ [TEST] ${steps.length} étape(s) créée(s)`,
        { count: steps.length },
      );

      // 4. Créer une semaine complète de distributions
      const distributions = await Promise.all([
        this.prismaService.distribution.create({
          data: {
            campaignId: campaign.id,
            type: DistributionType.RECURRING,
            dayOfWeek: 1, // Lundi
            isActive: true,
          },
        }),
        this.prismaService.distribution.create({
          data: {
            campaignId: campaign.id,
            type: DistributionType.RECURRING,
            dayOfWeek: 2, // Mardi
            isActive: true,
          },
        }),
        this.prismaService.distribution.create({
          data: {
            campaignId: campaign.id,
            type: DistributionType.RECURRING,
            dayOfWeek: 3, // Mercredi
            isActive: true,
          },
        }),
        this.prismaService.distribution.create({
          data: {
            campaignId: campaign.id,
            type: DistributionType.RECURRING,
            dayOfWeek: 4, // Jeudi
            isActive: true,
          },
        }),
        this.prismaService.distribution.create({
          data: {
            campaignId: campaign.id,
            type: DistributionType.RECURRING,
            dayOfWeek: 5, // Vendredi
            isActive: true,
          },
        }),
      ]);

      await this.logsService.logSuccess(
        LogCategory.TEST,
        `✅ [TEST] Semaine de distribution créée (${distributions.length} jours)`,
        { count: distributions.length },
      );

      // 5. Log final de succès
      await this.logsService.logSuccess(
        LogCategory.TEST,
        `✅ [TEST] Scénario complet exécuté avec succès !`,
        {
          campaign: campaign.id,
          procedure: procedure.id,
          stepsCount: steps.length,
          distributionsCount: distributions.length,
        },
      );

      return {
        success: true,
        message:
          'Scénario de test complet exécuté avec succès ! Toutes les données ont été créées.',
        summary: {
          profile: {
            id: testProfile.id,
            email: testProfile.email,
            role: testProfile.role,
          },
          campaign: {
            id: campaign.id,
            title: campaign.title,
          },
          procedure: {
            id: procedure.id,
            title: procedure.title,
          },
          steps: {
            count: steps.length,
            ids: steps.map((s) => s.id),
          },
          distributions: {
            count: distributions.length,
            days: distributions.map((d) => ({
              id: d.id,
              day: d.dayOfWeek,
              type: d.type,
            })),
          },
        },
        instructions: {
          nextSteps: [
            '1. Vérifier la campagne créée via GET /api/v1/campaigns',
            '2. Consulter la procédure via GET /api/v1/campaigns/:id/procedures',
            '3. Voir les étapes via GET /api/v1/procedures/:id/steps',
            '4. Vérifier les distributions via GET /api/v1/campaigns/:id/distributions',
            '5. Nettoyer avec DELETE /api/v1/test/cleanup-all si nécessaire',
          ],
        },
      };
    } catch (error) {
      await this.logsService.logError(
        LogCategory.TEST,
        `❌ [TEST] Erreur lors de l'exécution du scénario: ${error.message}`,
        { error: error.message, stack: error.stack },
      );

      throw error;
    }
  }

  // ==================== GLOBAL CLEANUP ====================

  @Delete('cleanup-all')
  @ApiOperation({
    summary: '[TEST] Nettoyage complet de toutes les données de test TEST_API_',
    description:
      'ATTENTION: Supprime TOUTES les données contenant le préfixe TEST_API_ dans TOUTES les tables (profiles, campaigns, procedures, steps, distributions, etc.). À utiliser uniquement en développement.',
  })
  @ApiResponse({ status: 200, description: 'Nettoyage complet effectué' })
  async cleanupAll() {
    await this.logsService.logInfo(
      LogCategory.TEST,
      `🔵 [TEST] Début du nettoyage complet des données TEST_API_`,
      {},
    );

    // Compter les enregistrements avant suppression
    const [stepsCount, proceduresCount, distributionsCount, campaignsCount, profilesCount] =
      await Promise.all([
        this.prismaService.step.count({
          where: { title: { contains: 'TEST_API_' } },
        }),
        this.prismaService.procedure.count({
          where: { title: { contains: 'TEST_API_' } },
        }),
        this.prismaService.distribution.count({
          where: {
            campaign: { title: { contains: 'TEST_API_' } },
          },
        }),
        this.prismaService.campaign.count({
          where: { title: { contains: 'TEST_API_' } },
        }),
        this.prismaService.profile.count({
          where: {
            OR: [
              { email: { contains: 'TEST_API_' } },
              { firstName: { contains: 'TEST_API_' } },
              { supabaseUserId: { contains: 'TEST_API_' } },
            ],
          },
        }),
      ]);

    // Supprimer dans l'ordre pour respecter les contraintes FK
    // 1. Supprimer les étapes (dépendent des procédures)
    await this.prismaService.step.deleteMany({
      where: { title: { contains: 'TEST_API_' } },
    });

    // 2. Supprimer les procédures (dépendent des campagnes)
    await this.prismaService.procedure.deleteMany({
      where: { title: { contains: 'TEST_API_' } },
    });

    // 3. Supprimer les distributions (dépendent des campagnes)
    await this.prismaService.distribution.deleteMany({
      where: {
        campaign: { title: { contains: 'TEST_API_' } },
      },
    });

    // 4. Supprimer les campagnes (dépendent des profiles)
    await this.prismaService.campaign.deleteMany({
      where: { title: { contains: 'TEST_API_' } },
    });

    // 5. Supprimer les profiles de test
    await this.prismaService.profile.deleteMany({
      where: {
        OR: [
          { email: { contains: 'TEST_API_' } },
          { firstName: { contains: 'TEST_API_' } },
          { supabaseUserId: { contains: 'TEST_API_' } },
        ],
      },
    });

    const totalCount =
      stepsCount +
      proceduresCount +
      distributionsCount +
      campaignsCount +
      profilesCount;

    await this.logsService.logWarning(
      LogCategory.TEST,
      `⚠️ [TEST] Nettoyage complet effectué: ${totalCount} enregistrement(s) TEST_API_ supprimé(s)`,
      {
        stepsCount,
        proceduresCount,
        distributionsCount,
        campaignsCount,
        profilesCount,
        totalCount,
      },
    );

    return {
      success: true,
      message: 'Nettoyage complet effectué avec succès - Toutes les données TEST_API_ ont été supprimées',
      details: {
        profiles: profilesCount,
        campaigns: campaignsCount,
        procedures: proceduresCount,
        steps: stepsCount,
        distributions: distributionsCount,
        total: totalCount,
      },
    };
  }
}
