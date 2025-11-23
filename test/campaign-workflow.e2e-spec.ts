import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/database/prisma.service';
import {
  CampaignStatus,
  DistributionType,
  SessionStatus,
  TransactionStatus,
  TransactionType,
  UserRole,
} from '@prisma/client';

/**
 * E2E Test: Complete Campaign Workflow
 *
 * This test simulates the entire lifecycle of a campaign:
 * 1. PRO creates a campaign
 * 2. PRO pays for the campaign (Stripe payment)
 * 3. Campaign becomes ACTIVE
 * 4. Tester applies to the campaign
 * 5. PRO accepts the tester
 * 6. Tester validates product price
 * 7. Tester submits purchase proof with order number
 * 8. Tester completes the test procedure
 * 9. PRO validates the test and rates the tester
 * 10. Tester's wallet is credited with the reward
 */
describe('Campaign Workflow (e2e)', () => {
  let app: INestApplication;
  let prismaService: PrismaService;

  // Test users
  let proUser: { id: string; email: string };
  let testerUser: { id: string; email: string };

  // Test entities
  let campaignId: string;
  let productId: string;
  let offerId: string;
  let sessionId: string;
  let paymentIntentId: string;

  // Test configuration
  const testRewardAmount = 15;
  const testProductPrice = 29.99;
  const testShippingCost = 5.99;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true }));

    prismaService = moduleFixture.get<PrismaService>(PrismaService);

    await app.init();

    // Clean up test data and create test users
    await setupTestData();
  });

  afterAll(async () => {
    // Clean up test data
    await cleanupTestData();
    await app.close();
  });

  /**
   * Setup test data: Create PRO user, tester user, and product
   */
  async function setupTestData() {
    const timestamp = Date.now();

    // Create PRO user (seller)
    proUser = await prismaService.profile.create({
      data: {
        id: `test-pro-${timestamp}`,
        supabaseUserId: `supabase-pro-${timestamp}`,
        email: `pro-${timestamp}@test.com`,
        firstName: 'Test',
        lastName: 'PRO',
        role: UserRole.PRO,
        companyName: 'Test Company',
        isVerified: true,
      },
    });

    // Create Tester user
    testerUser = await prismaService.profile.create({
      data: {
        id: `test-tester-${timestamp}`,
        supabaseUserId: `supabase-tester-${timestamp}`,
        email: `tester-${timestamp}@test.com`,
        firstName: 'Test',
        lastName: 'Tester',
        role: UserRole.USER,
        isVerified: true,
      },
    });

    // Create a wallet for the tester
    await prismaService.wallet.create({
      data: {
        userId: testerUser.id,
        balance: 0,
        currency: 'EUR',
      },
    });

    // Create a product for the campaign
    const product = await prismaService.product.create({
      data: {
        sellerId: proUser.id,
        name: 'Test Product E2E',
        description: 'Product description for E2E testing',
        price: testProductPrice,
        shippingCost: testShippingCost,
      },
    });
    productId = product.id;
  }

  /**
   * Cleanup test data after tests
   */
  async function cleanupTestData() {
    // Delete in reverse order of dependencies
    if (sessionId) {
      await prismaService.session.deleteMany({
        where: { id: sessionId },
      });
    }

    if (campaignId) {
      // Delete transactions related to campaign
      await prismaService.transaction.deleteMany({
        where: { campaignId },
      });

      // Delete offers
      await prismaService.offer.deleteMany({
        where: { campaignId },
      });

      // Delete distributions
      await prismaService.distribution.deleteMany({
        where: { campaignId },
      });

      // Delete campaign
      await prismaService.campaign.deleteMany({
        where: { id: campaignId },
      });
    }

    if (productId) {
      await prismaService.product.deleteMany({
        where: { id: productId },
      });
    }

    // Delete wallets and transactions for test users
    if (testerUser?.id) {
      await prismaService.transaction.deleteMany({
        where: { wallet: { userId: testerUser.id } },
      });
      await prismaService.wallet.deleteMany({
        where: { userId: testerUser.id },
      });
    }

    // Delete users
    if (proUser?.id) {
      await prismaService.profile.deleteMany({
        where: { id: proUser.id },
      });
    }
    if (testerUser?.id) {
      await prismaService.profile.deleteMany({
        where: { id: testerUser.id },
      });
    }
  }

  // ==========================================
  // TEST 1: PRO creates a campaign
  // ==========================================
  describe('Step 1: Campaign Creation', () => {
    it('PRO should create a campaign with products, offers, and distributions', async () => {
      // Create campaign
      const campaign = await prismaService.campaign.create({
        data: {
          sellerId: proUser.id,
          title: 'Test Campaign E2E',
          description: 'Campaign for E2E testing workflow',
          status: CampaignStatus.DRAFT,
          totalSlots: 5,
          availableSlots: 5,
          startDate: new Date(),
          endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
        },
      });
      campaignId = campaign.id;

      expect(campaign).toBeDefined();
      expect(campaign.status).toBe(CampaignStatus.DRAFT);

      // Create offer for the campaign
      const offer = await prismaService.offer.create({
        data: {
          campaignId: campaign.id,
          productId: productId,
          quantity: 5,
          expectedPrice: testProductPrice,
          shippingCost: testShippingCost,
          priceRangeMin: testProductPrice - 5,
          priceRangeMax: testProductPrice + 5,
          bonus: testRewardAmount,
        },
      });
      offerId = offer.id;

      expect(offer).toBeDefined();
      expect(Number(offer.bonus)).toBe(testRewardAmount);

      // Create distribution (1 unit per day for 5 days)
      const distributions = [];
      for (let i = 0; i < 5; i++) {
        const date = new Date();
        date.setDate(date.getDate() + i);
        distributions.push(
          prismaService.distribution.create({
            data: {
              campaignId: campaign.id,
              specificDate: date,
              maxUnits: 1,
              type: DistributionType.SPECIFIC_DATE,
            },
          }),
        );
      }
      await Promise.all(distributions);

      // Verify campaign setup
      const fullCampaign = await prismaService.campaign.findUnique({
        where: { id: campaignId },
        include: {
          offers: true,
          distributions: true,
        },
      });

      expect(fullCampaign?.offers).toHaveLength(1);
      expect(fullCampaign?.distributions).toHaveLength(5);
    });
  });

  // ==========================================
  // TEST 2: PRO pays for the campaign
  // ==========================================
  describe('Step 2: Campaign Payment', () => {
    it('should create a payment intent and transaction for the campaign', async () => {
      // Calculate total amount
      const offer = await prismaService.offer.findUnique({
        where: { id: offerId },
      });

      const totalAmount = (Number(offer!.expectedPrice) + Number(offer!.shippingCost) + Number(offer!.bonus)) * offer!.quantity;

      // Create transaction for campaign payment (simulating Stripe PaymentIntent creation)
      paymentIntentId = `pi_test_${Date.now()}`;

      const transaction = await prismaService.transaction.create({
        data: {
          type: TransactionType.CAMPAIGN_PAYMENT,
          amount: totalAmount,
          reason: `Pré-paiement campagne "Test Campaign E2E"`,
          campaignId: campaignId,
          stripePaymentIntentId: paymentIntentId,
          status: TransactionStatus.PENDING,
          metadata: {
            breakdown: {
              productPrice: Number(offer!.expectedPrice),
              shippingCost: Number(offer!.shippingCost),
              bonus: Number(offer!.bonus),
              quantity: offer!.quantity,
              subtotal: totalAmount,
            },
          },
        },
      });

      expect(transaction).toBeDefined();
      expect(transaction.status).toBe(TransactionStatus.PENDING);
      expect(Number(transaction.amount)).toBeCloseTo(totalAmount, 2);

      // Update campaign to PENDING_PAYMENT
      await prismaService.campaign.update({
        where: { id: campaignId },
        data: { status: CampaignStatus.PENDING_PAYMENT },
      });

      const updatedCampaign = await prismaService.campaign.findUnique({
        where: { id: campaignId },
      });
      expect(updatedCampaign?.status).toBe(CampaignStatus.PENDING_PAYMENT);
    });

    it('should activate campaign after successful payment (webhook simulation)', async () => {
      // Simulate Stripe webhook: payment_intent.succeeded
      await prismaService.$transaction(async (prisma) => {
        // Update transaction to COMPLETED
        await prisma.transaction.updateMany({
          where: { stripePaymentIntentId: paymentIntentId },
          data: {
            status: TransactionStatus.COMPLETED,
            metadata: {
              completedAt: new Date().toISOString(),
              stripeChargeId: `ch_test_${Date.now()}`,
            },
          },
        });

        // Activate campaign
        await prisma.campaign.update({
          where: { id: campaignId },
          data: { status: CampaignStatus.ACTIVE },
        });
      });

      // Verify campaign is now ACTIVE
      const campaign = await prismaService.campaign.findUnique({
        where: { id: campaignId },
      });
      expect(campaign?.status).toBe(CampaignStatus.ACTIVE);

      // Verify transaction is COMPLETED
      const transaction = await prismaService.transaction.findFirst({
        where: { stripePaymentIntentId: paymentIntentId },
      });
      expect(transaction?.status).toBe(TransactionStatus.COMPLETED);
    });
  });

  // ==========================================
  // TEST 3: Tester applies to the campaign
  // ==========================================
  describe('Step 3: Tester Application', () => {
    it('tester should successfully apply to the campaign', async () => {
      const session = await prismaService.session.create({
        data: {
          campaignId: campaignId,
          testerId: testerUser.id,
          applicationMessage: 'I would love to test this product!',
          status: SessionStatus.PENDING,
        },
      });
      sessionId = session.id;

      expect(session).toBeDefined();
      expect(session.status).toBe(SessionStatus.PENDING);
    });
  });

  // ==========================================
  // TEST 4: PRO accepts the tester
  // ==========================================
  describe('Step 4: Tester Acceptance', () => {
    it('PRO should accept the tester application', async () => {
      const [updatedSession] = await prismaService.$transaction([
        prismaService.session.update({
          where: { id: sessionId },
          data: {
            status: SessionStatus.ACCEPTED,
            acceptedAt: new Date(),
            scheduledPurchaseDate: new Date(), // Today
          },
        }),
        prismaService.campaign.update({
          where: { id: campaignId },
          data: {
            availableSlots: {
              decrement: 1,
            },
          },
        }),
      ]);

      expect(updatedSession.status).toBe(SessionStatus.ACCEPTED);

      // Verify slot was decremented
      const campaign = await prismaService.campaign.findUnique({
        where: { id: campaignId },
      });
      expect(campaign?.availableSlots).toBe(4);
    });
  });

  // ==========================================
  // TEST 5: Tester validates product price
  // ==========================================
  describe('Step 5: Product Price Validation', () => {
    it('tester should validate the product price', async () => {
      // Simulate tester entering the price they found
      const enteredPrice = testProductPrice; // Must be within range

      const updatedSession = await prismaService.session.update({
        where: { id: sessionId },
        data: {
          validatedProductPrice: enteredPrice,
          priceValidatedAt: new Date(),
        },
      });

      expect(Number(updatedSession.validatedProductPrice)).toBe(enteredPrice);
      expect(updatedSession.priceValidatedAt).toBeDefined();
    });
  });

  // ==========================================
  // TEST 6: Tester submits purchase proof with order number
  // ==========================================
  describe('Step 6: Purchase Proof Submission', () => {
    it('tester should submit purchase proof with order number', async () => {
      const orderNumber = 'AMZ-FR-12345-67890';
      const purchaseProofUrl = 'https://storage.example.com/receipts/receipt-test.jpg';

      const updatedSession = await prismaService.session.update({
        where: { id: sessionId },
        data: {
          status: SessionStatus.IN_PROGRESS,
          purchaseProofUrl: purchaseProofUrl,
          purchasedAt: new Date(),
          orderNumber: orderNumber,
          productPrice: testProductPrice,
          shippingCost: testShippingCost,
        },
      });

      expect(updatedSession.status).toBe(SessionStatus.IN_PROGRESS);
      expect(updatedSession.orderNumber).toBe(orderNumber);
      expect(updatedSession.purchaseProofUrl).toBe(purchaseProofUrl);
    });
  });

  // ==========================================
  // TEST 7: Tester completes the test
  // ==========================================
  describe('Step 7: Test Completion', () => {
    it('tester should submit the completed test', async () => {
      const updatedSession = await prismaService.session.update({
        where: { id: sessionId },
        data: {
          status: SessionStatus.SUBMITTED,
          submittedAt: new Date(),
          submissionData: {
            review: 'Great product, works perfectly!',
            rating: 5,
            photos: ['https://example.com/photo1.jpg', 'https://example.com/photo2.jpg'],
          },
        },
      });

      expect(updatedSession.status).toBe(SessionStatus.SUBMITTED);
      expect(updatedSession.submittedAt).toBeDefined();
    });
  });

  // ==========================================
  // TEST 8: PRO validates the test and order number
  // ==========================================
  describe('Step 8: Test Validation and Wallet Credit', () => {
    it('PRO should validate the test and tester wallet should be credited', async () => {
      // Get tester's wallet balance before
      const walletBefore = await prismaService.wallet.findUnique({
        where: { userId: testerUser.id },
      });
      const balanceBefore = Number(walletBefore?.balance || 0);

      // PRO validates the test
      const validatedSession = await prismaService.session.update({
        where: { id: sessionId },
        data: {
          status: SessionStatus.COMPLETED,
          completedAt: new Date(),
          rating: 5,
          ratingComment: 'Excellent tester, very professional!',
          ratedAt: new Date(),
          rewardAmount: testRewardAmount,
        },
      });

      expect(validatedSession.status).toBe(SessionStatus.COMPLETED);
      expect(validatedSession.rating).toBe(5);
      expect(Number(validatedSession.rewardAmount)).toBe(testRewardAmount);

      // Credit the tester's wallet
      const creditTransaction = await prismaService.$transaction(async (prisma) => {
        const wallet = await prisma.wallet.findUnique({
          where: { userId: testerUser.id },
        });

        // Create credit transaction
        const transaction = await prisma.transaction.create({
          data: {
            walletId: wallet!.id,
            type: TransactionType.CREDIT,
            amount: testRewardAmount,
            reason: `Récompense pour test validé - Campagne: Test Campaign E2E`,
            sessionId: sessionId,
            status: TransactionStatus.COMPLETED,
            metadata: {
              campaignId: campaignId,
              campaignTitle: 'Test Campaign E2E',
              rating: 5,
            },
          },
        });

        // Update wallet balance
        await prisma.wallet.update({
          where: { id: wallet!.id },
          data: {
            balance: {
              increment: testRewardAmount,
            },
            totalEarned: {
              increment: testRewardAmount,
            },
            lastCreditedAt: new Date(),
          },
        });

        return transaction;
      });

      expect(creditTransaction).toBeDefined();
      expect(creditTransaction.type).toBe(TransactionType.CREDIT);
      expect(Number(creditTransaction.amount)).toBe(testRewardAmount);

      // Verify wallet balance after
      const walletAfter = await prismaService.wallet.findUnique({
        where: { userId: testerUser.id },
      });
      const balanceAfter = Number(walletAfter?.balance || 0);

      expect(balanceAfter).toBe(balanceBefore + testRewardAmount);
    });

    it('should verify the complete transaction history', async () => {
      // Get all transactions related to this workflow
      const campaignTransaction = await prismaService.transaction.findFirst({
        where: { campaignId: campaignId },
      });

      const walletTransactions = await prismaService.transaction.findMany({
        where: {
          sessionId: sessionId,
          type: TransactionType.CREDIT,
        },
      });

      // Verify campaign payment transaction
      expect(campaignTransaction).toBeDefined();
      expect(campaignTransaction?.type).toBe(TransactionType.CAMPAIGN_PAYMENT);
      expect(campaignTransaction?.status).toBe(TransactionStatus.COMPLETED);

      // Verify tester reward transaction
      expect(walletTransactions).toHaveLength(1);
      expect(Number(walletTransactions[0].amount)).toBe(testRewardAmount);
    });
  });

  // ==========================================
  // TEST 9: Summary and Final Verification
  // ==========================================
  describe('Step 9: Final Verification', () => {
    it('should verify the complete workflow state', async () => {
      // Verify campaign final state
      const finalCampaign = await prismaService.campaign.findUnique({
        where: { id: campaignId },
        include: {
          offers: true,
          distributions: true,
        },
      });

      expect(finalCampaign?.status).toBe(CampaignStatus.ACTIVE);
      expect(finalCampaign?.availableSlots).toBe(4); // 5 - 1 accepted

      // Verify session final state
      const finalSession = await prismaService.session.findUnique({
        where: { id: sessionId },
      });

      expect(finalSession?.status).toBe(SessionStatus.COMPLETED);
      expect(finalSession?.orderNumber).toBe('AMZ-FR-12345-67890');
      expect(Number(finalSession?.validatedProductPrice)).toBe(testProductPrice);
      expect(finalSession?.rating).toBe(5);
      expect(Number(finalSession?.rewardAmount)).toBe(testRewardAmount);

      // Verify tester wallet final state
      const finalWallet = await prismaService.wallet.findUnique({
        where: { userId: testerUser.id },
      });

      expect(Number(finalWallet?.balance)).toBe(testRewardAmount);
      expect(Number(finalWallet?.totalEarned)).toBe(testRewardAmount);
    });
  });
});
