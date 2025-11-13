import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../database/prisma.service';
import { LogsService } from '../logs/logs.service';
import { LogCategory } from '@prisma/client';
import {
  TestResult,
  TestSummary,
  TestContext,
} from './interfaces/test-result.interface';

@Injectable()
export class ApiTesterService {
  private readonly logger = new Logger(ApiTesterService.name);
  private readonly baseUrl: string;
  private context: TestContext = {};
  private results: TestResult[] = [];
  private startTime: number = 0;

  constructor(
    private readonly configService: ConfigService,
    private readonly prismaService: PrismaService,
    private readonly logsService: LogsService,
  ) {
    const port = this.configService.get('port') || 3000;
    this.baseUrl = `http://localhost:${port}/api/v1`;
  }

  /**
   * Exécute tous les tests API de manière séquentielle
   */
  async runApiTests(): Promise<TestSummary> {
    this.startTime = Date.now();
    this.results = [];
    this.context = {};

    await this.logsService.logInfo(
      LogCategory.TEST_API,
      '🔵 [TEST_API] Début des tests complets de l\'API',
      { timestamp: new Date().toISOString() },
    );

    try {
      // A. Authentification & Setup
      await this.testAuth();

      // B. Tests par module
      await this.testUsersModule();
      await this.testProductsModule();
      await this.testCampaignsModule();
      await this.proceduresModule();
      await this.stepsModule();
      await this.distributionsModule();
      await this.testLogsModule();

      // C. Cleanup
      await this.cleanupTestData();

      const duration = this.formatDuration(Date.now() - this.startTime);
      const passed = this.results.filter((r) => r.status === 'passed').length;
      const failed = this.results.filter((r) => r.status === 'failed').length;

      await this.logsService.logSuccess(
        LogCategory.TEST_API,
        `✅ [TEST_API] Tests terminés: ${passed}/${this.results.length} réussis`,
        { passed, failed, total: this.results.length, duration },
      );

      return {
        success: failed === 0,
        duration,
        timestamp: new Date().toISOString(),
        summary: {
          totalEndpoints: 122,
          tested: this.results.length,
          passed,
          failed,
          skipped: 0,
        },
        phases: [],
        byModule: {},
        failures: [],
        detailedLogs: [],
        cleanup: {
          profiles: 0,
          products: 0,
          campaigns: 0,
          procedures: 0,
          steps: 0,
          distributions: 0,
          sessions: 0,
          messages: 0,
          notifications: 0,
          total: 0,
        },
      };
    } catch (error) {
      await this.logsService.logError(
        LogCategory.TEST_API,
        `❌ [TEST_API] Erreur critique lors des tests: ${error.message}`,
        { error: error.message, stack: error.stack },
      );

      throw error;
    }
  }

  /**
   * A. Tests d'authentification
   */
  private async testAuth(): Promise<void> {
    this.logger.log('🔵 [TEST_API] Module: Authentification');

    // 1. Signup USER
    await this.testEndpoint(
      'auth',
      'POST',
      '/auth/signup',
      {
        email: `testuser_${Date.now()}@test.com`,
        password: 'password123',
        role: 'USER',
        firstName: 'Test',
        lastName: 'User',
      },
      null,
      201,
      async (response) => {
        this.context.tokenUser = response.access_token;
        this.context.userUserId = response.profile.id;
      },
    );

    // 2. Signup PRO
    await this.testEndpoint(
      'auth',
      'POST',
      '/auth/signup',
      {
        email: `testpro_${Date.now()}@test.com`,
        password: 'password123',
        role: 'PRO',
        firstName: 'Test',
        lastName: 'Pro',
        companyName: 'Test Company',
      },
      null,
      201,
      async (response) => {
        this.context.tokenPro = response.access_token;
        this.context.userProId = response.profile.id;
      },
    );

    // 3. Signup ADMIN
    await this.testEndpoint(
      'auth',
      'POST',
      '/auth/signup',
      {
        email: `testadmin_${Date.now()}@test.com`,
        password: 'password123',
        role: 'ADMIN',
        firstName: 'Test',
        lastName: 'Admin',
      },
      null,
      201,
      async (response) => {
        this.context.tokenAdmin = response.access_token;
        this.context.userAdminId = response.profile.id;
      },
    );

    // 4. Vérifier token USER
    await this.testEndpoint(
      'auth',
      'GET',
      '/auth/verify',
      null,
      this.context.tokenUser,
      200,
    );

    // 5. Vérifier token PRO
    await this.testEndpoint(
      'auth',
      'GET',
      '/auth/verify',
      null,
      this.context.tokenPro,
      200,
    );

    // 6. Vérifier token ADMIN
    await this.testEndpoint(
      'auth',
      'GET',
      '/auth/verify',
      null,
      this.context.tokenAdmin,
      200,
    );
  }

  /**
   * B1. Tests du module Users
   */
  private async testUsersModule(): Promise<void> {
    this.logger.log('🔵 [TEST_API] Module: Users');

    // GET profile USER
    await this.testEndpoint(
      'users',
      'GET',
      '/users/profile',
      null,
      this.context.tokenUser,
      200,
    );

    // GET profile PRO
    await this.testEndpoint(
      'users',
      'GET',
      '/users/profile',
      null,
      this.context.tokenPro,
      200,
    );

    // GET profile ADMIN
    await this.testEndpoint(
      'users',
      'GET',
      '/users/profile',
      null,
      this.context.tokenAdmin,
      200,
    );
  }

  /**
   * B2. Tests du module Products
   */
  private async testProductsModule(): Promise<void> {
    this.logger.log('🔵 [TEST_API] Module: Products');

    // POST create product (PRO)
    await this.testEndpoint(
      'products',
      'POST',
      '/products',
      {
        name: 'Test Product',
        description: 'Test product description',
        category: 'Electronics',
        price: 99.99,
        shippingCost: 5.0,
        reward: 10.0,
        stock: 100,
      },
      this.context.tokenPro,
      201,
      async (response) => {
        this.context.productId = response.id;
      },
    );

    // GET list products (public)
    await this.testEndpoint('products', 'GET', '/products', null, null, 200);

    // GET product details
    await this.testEndpoint(
      'products',
      'GET',
      `/products/${this.context.productId}`,
      null,
      null,
      200,
    );

    // PATCH update product (PRO)
    await this.testEndpoint(
      'products',
      'PATCH',
      `/products/${this.context.productId}`,
      {
        price: 89.99,
      },
      this.context.tokenPro,
      200,
    );
  }

  /**
   * B3. Tests du module Campaigns
   */
  private async testCampaignsModule(): Promise<void> {
    this.logger.log('🔵 [TEST_API] Module: Campaigns');

    // POST create campaign (PRO)
    await this.testEndpoint(
      'campaigns',
      'POST',
      '/campaigns',
      {
        title: 'Test Campaign',
        description: 'Test campaign description',
        startDate: new Date().toISOString(),
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        totalSlots: 50,
      },
      this.context.tokenPro,
      201,
      async (response) => {
        this.context.campaignId = response.id;
      },
    );

    // GET list campaigns (public)
    await this.testEndpoint('campaigns', 'GET', '/campaigns', null, null, 200);

    // GET campaign details
    await this.testEndpoint(
      'campaigns',
      'GET',
      `/campaigns/${this.context.campaignId}`,
      null,
      null,
      200,
    );

    // PATCH update campaign (PRO)
    await this.testEndpoint(
      'campaigns',
      'PATCH',
      `/campaigns/${this.context.campaignId}`,
      {
        title: 'Updated Test Campaign',
      },
      this.context.tokenPro,
      200,
    );

    // POST add products to campaign (PRO)
    await this.testEndpoint(
      'campaigns',
      'POST',
      `/campaigns/${this.context.campaignId}/products`,
      {
        products: [
          {
            productId: this.context.productId,
            quantity: 10,
          },
        ],
      },
      this.context.tokenPro,
      200,
    );
  }

  /**
   * B4. Tests du module Test Procedures
   */
  private async proceduresModule(): Promise<void> {
    this.logger.log('🔵 [TEST_API] Module: Test Procedures');

    // POST create procedure (PRO)
    await this.testEndpoint(
      'test_procedures',
      'POST',
      `/campaigns/${this.context.campaignId}/procedures`,
      {
        title: 'Test Procedure',
        description: 'Test procedure description',
        order: 1,
        isRequired: true,
      },
      this.context.tokenPro,
      201,
      async (response) => {
        this.context.procedureId = response.id;
      },
    );

    // GET list procedures (public)
    await this.testEndpoint(
      'test_procedures',
      'GET',
      `/campaigns/${this.context.campaignId}/procedures`,
      null,
      null,
      200,
    );

    // GET procedure details
    await this.testEndpoint(
      'test_procedures',
      'GET',
      `/campaigns/${this.context.campaignId}/procedures/${this.context.procedureId}`,
      null,
      null,
      200,
    );

    // PATCH update procedure (PRO)
    await this.testEndpoint(
      'test_procedures',
      'PATCH',
      `/campaigns/${this.context.campaignId}/procedures/${this.context.procedureId}`,
      {
        title: 'Updated Test Procedure',
      },
      this.context.tokenPro,
      200,
    );
  }

  /**
   * B5. Tests du module Test Steps
   */
  private async stepsModule(): Promise<void> {
    this.logger.log('🔵 [TEST_API] Module: Test Steps');

    // POST create step (PRO)
    await this.testEndpoint(
      'test_steps',
      'POST',
      `/procedures/${this.context.procedureId}/steps`,
      {
        title: 'Test Step',
        description: 'Test step description',
        type: 'TEXT',
        order: 1,
        isRequired: true,
      },
      this.context.tokenPro,
      201,
      async (response) => {
        this.context.stepId = response.id;
      },
    );

    // GET list steps (public)
    await this.testEndpoint(
      'test_steps',
      'GET',
      `/procedures/${this.context.procedureId}/steps`,
      null,
      null,
      200,
    );

    // GET step details
    await this.testEndpoint(
      'test_steps',
      'GET',
      `/steps/${this.context.stepId}`,
      null,
      null,
      200,
    );

    // PATCH update step (PRO)
    await this.testEndpoint(
      'test_steps',
      'PATCH',
      `/steps/${this.context.stepId}`,
      {
        title: 'Updated Test Step',
      },
      this.context.tokenPro,
      200,
    );
  }

  /**
   * B6. Tests du module Distributions
   */
  private async distributionsModule(): Promise<void> {
    this.logger.log('🔵 [TEST_API] Module: Distributions');

    // POST create distribution (PRO)
    await this.testEndpoint(
      'distributions',
      'POST',
      `/campaigns/${this.context.campaignId}/distributions`,
      {
        dayOfWeek: 1,
        maxUnits: 5,
      },
      this.context.tokenPro,
      201,
      async (response) => {
        this.context.distributionIds = [response.id];
      },
    );

    // POST create week (PRO)
    await this.testEndpoint(
      'distributions',
      'POST',
      `/campaigns/${this.context.campaignId}/distributions/week`,
      {
        monday: 5,
        tuesday: 3,
        wednesday: 7,
        thursday: 4,
        friday: 6,
      },
      this.context.tokenPro,
      200,
    );

    // GET list distributions (public)
    await this.testEndpoint(
      'distributions',
      'GET',
      `/campaigns/${this.context.campaignId}/distributions`,
      null,
      null,
      200,
    );
  }

  /**
   * B7. Tests du module Logs (ADMIN only)
   */
  private async testLogsModule(): Promise<void> {
    this.logger.log('🔵 [TEST_API] Module: Logs');

    // GET logs list (ADMIN)
    await this.testEndpoint(
      'logs',
      'GET',
      '/logs',
      null,
      this.context.tokenAdmin,
      200,
    );

    // GET logs stats (ADMIN)
    await this.testEndpoint(
      'logs',
      'GET',
      '/logs/stats',
      null,
      this.context.tokenAdmin,
      200,
    );
  }

  /**
   * C. Cleanup - Supprimer toutes les données créées
   */
  private async cleanupTestData(): Promise<void> {
    this.logger.log('🔵 [TEST_API] Cleanup: Suppression des données de test');

    try {
      // Supprimer dans l'ordre inverse pour respecter les contraintes FK
      if (this.context.stepId) {
        await this.prismaService.step.deleteMany({
          where: { procedureId: this.context.procedureId },
        });
      }

      if (this.context.procedureId) {
        await this.prismaService.procedure.deleteMany({
          where: { campaignId: this.context.campaignId },
        });
      }

      if (this.context.campaignId) {
        await this.prismaService.distribution.deleteMany({
          where: { campaignId: this.context.campaignId },
        });

        await this.prismaService.campaignProduct.deleteMany({
          where: { campaignId: this.context.campaignId },
        });

        await this.prismaService.campaign.delete({
          where: { id: this.context.campaignId },
        });
      }

      if (this.context.productId) {
        await this.prismaService.product.delete({
          where: { id: this.context.productId },
        });
      }

      // Supprimer les profils créés
      if (this.context.userUserId) {
        await this.prismaService.profile.delete({
          where: { id: this.context.userUserId },
        });
      }

      if (this.context.userProId) {
        await this.prismaService.profile.delete({
          where: { id: this.context.userProId },
        });
      }

      if (this.context.userAdminId) {
        await this.prismaService.profile.delete({
          where: { id: this.context.userAdminId },
        });
      }

      await this.logsService.logSuccess(
        LogCategory.TEST_API,
        '✅ [TEST_API] Cleanup: Toutes les données de test ont été supprimées',
        {},
      );
    } catch (error) {
      await this.logsService.logWarning(
        LogCategory.TEST_API,
        `⚠️ [TEST_API] Cleanup: Erreur lors de la suppression: ${error.message}`,
        { error: error.message },
      );
    }
  }

  /**
   * Teste un endpoint spécifique
   */
  private async testEndpoint(
    module: string,
    method: string,
    path: string,
    body: any,
    token: string | null | undefined,
    expectedStatus: number,
    onSuccess?: (response: any) => Promise<void>,
  ): Promise<void> {
    const startTime = Date.now();
    const url = `${this.baseUrl}${path}`;

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const options: RequestInit = {
        method,
        headers,
      };

      if (body && (method === 'POST' || method === 'PATCH' || method === 'PUT')) {
        options.body = JSON.stringify(body);
      }

      const response = await fetch(url, options);
      const duration = Date.now() - startTime;
      const statusCode = response.status;

      let responseData: any = null;
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        responseData = await response.json();
      }

      if (statusCode === expectedStatus) {
        this.results.push({
          module,
          endpoint: path,
          method,
          status: 'passed',
          statusCode,
          duration,
        });

        await this.logsService.logSuccess(
          LogCategory.TEST_API,
          `✅ [TEST_API] ${module}: ${method} ${path} - ${statusCode} OK`,
          { duration: `${duration}ms`, statusCode },
        );

        if (onSuccess && responseData) {
          await onSuccess(responseData);
        }
      } else {
        this.results.push({
          module,
          endpoint: path,
          method,
          status: 'failed',
          statusCode,
          duration,
          error: `Expected ${expectedStatus}, got ${statusCode}`,
        });

        await this.logsService.logError(
          LogCategory.TEST_API,
          `❌ [TEST_API] ${module}: ${method} ${path} - Expected ${expectedStatus}, got ${statusCode}`,
          { duration: `${duration}ms`, statusCode, response: responseData },
        );
      }
    } catch (error) {
      const duration = Date.now() - startTime;

      this.results.push({
        module,
        endpoint: path,
        method,
        status: 'failed',
        duration,
        error: error.message,
      });

      await this.logsService.logError(
        LogCategory.TEST_API,
        `❌ [TEST_API] ${module}: ${method} ${path} - ${error.message}`,
        { duration: `${duration}ms`, error: error.message, stack: error.stack },
      );
    }
  }

  /**
   * Formate la durée en format lisible
   */
  private formatDuration(ms: number): string {
    if (ms < 1000) {
      return `${ms}ms`;
    }
    const seconds = (ms / 1000).toFixed(1);
    return `${seconds}s`;
  }
}
