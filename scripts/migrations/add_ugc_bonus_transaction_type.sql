-- Migration: Ajouter UGC_BONUS au TransactionType enum
-- Date: 2026-01-03
-- Description: Ajout du type de transaction pour les bonus UGC

ALTER TYPE "TransactionType" ADD VALUE IF NOT EXISTS 'UGC_BONUS';

COMMENT ON TYPE "TransactionType" IS 'Types de transactions: CREDIT, DEBIT, CAMPAIGN_PAYMENT, CAMPAIGN_REFUND, CHAT_ORDER_ESCROW, CHAT_ORDER_RELEASE, CHAT_ORDER_REFUND, UGC_BONUS';
