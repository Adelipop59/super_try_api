-- ============================================
-- Script de Diagnostic des Sessions KYC
-- ============================================
-- Ce script vérifie l'état de toutes les sessions KYC des testeurs
-- et détecte les incohérences dans les données

-- 1. Vue d'ensemble des statuts KYC
SELECT
  '=== STATISTIQUES GLOBALES ===' as section;

SELECT
  verification_status,
  COUNT(*) as nombre_testeurs,
  ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 2) as pourcentage
FROM profiles
WHERE role = 'USER'
GROUP BY verification_status
ORDER BY nombre_testeurs DESC;

-- 2. Testeurs avec sessions KYC actives
SELECT
  '=== SESSIONS KYC ACTIVES (PENDING) ===' as section;

SELECT
  id,
  email,
  verification_status,
  stripe_verification_session_id,
  is_verified,
  is_active,
  created_at,
  CASE
    WHEN is_active = false THEN '🚫 BANNI'
    WHEN verification_status = 'pending' AND stripe_verification_session_id IS NOT NULL THEN '✅ Session en cours'
    WHEN verification_status = 'pending' AND stripe_verification_session_id IS NULL THEN '⚠️ INCOHÉRENCE: pending sans session Stripe'
    ELSE '✓ OK'
  END as status_check
FROM profiles
WHERE role = 'USER'
  AND verification_status = 'pending'
ORDER BY created_at DESC;

-- 3. Testeurs vérifiés
SELECT
  '=== TESTEURS VÉRIFIÉS (VERIFIED) ===' as section;

SELECT
  id,
  email,
  verification_status,
  is_verified,
  is_active,
  verified_at,
  stripe_verification_session_id,
  CASE
    WHEN is_active = false THEN '🚫 BANNI (mais vérifié)'
    WHEN is_verified = false THEN '⚠️ INCOHÉRENCE: verified mais isVerified=false'
    WHEN verified_at IS NULL THEN '⚠️ INCOHÉRENCE: verified mais pas de date'
    ELSE '✅ OK'
  END as status_check
FROM profiles
WHERE role = 'USER'
  AND verification_status = 'verified'
ORDER BY verified_at DESC NULLS LAST;

-- 4. Testeurs avec échec de vérification
SELECT
  '=== VÉRIFICATIONS ÉCHOUÉES (FAILED) ===' as section;

SELECT
  id,
  email,
  verification_status,
  verification_failed_reason,
  stripe_verification_session_id,
  is_active,
  created_at
FROM profiles
WHERE role = 'USER'
  AND verification_status = 'failed'
ORDER BY created_at DESC;

-- 5. Incohérences détectées
SELECT
  '=== INCOHÉRENCES DÉTECTÉES ===' as section;

SELECT
  id,
  email,
  verification_status,
  is_verified,
  is_active,
  stripe_verification_session_id,
  verified_at,
  CASE
    WHEN verification_status = 'verified' AND is_verified = false
      THEN '⚠️ verified mais isVerified=false'
    WHEN verification_status = 'pending' AND stripe_verification_session_id IS NULL
      THEN '⚠️ pending sans session Stripe'
    WHEN verification_status = 'verified' AND verified_at IS NULL
      THEN '⚠️ verified sans date de vérification'
    WHEN is_active = false
      THEN '🚫 Compte suspendu'
    ELSE 'Autre incohérence'
  END as type_incohérence
FROM profiles
WHERE role = 'USER'
  AND (
    -- Incohérence 1: verified mais isVerified=false
    (verification_status = 'verified' AND is_verified = false)
    -- Incohérence 2: pending sans session Stripe
    OR (verification_status = 'pending' AND stripe_verification_session_id IS NULL)
    -- Incohérence 3: verified sans date
    OR (verification_status = 'verified' AND verified_at IS NULL)
    -- Incohérence 4: compte suspendu
    OR (is_active = false)
  )
ORDER BY
  CASE
    WHEN is_active = false THEN 1
    WHEN verification_status = 'verified' AND is_verified = false THEN 2
    WHEN verification_status = 'verified' AND verified_at IS NULL THEN 3
    WHEN verification_status = 'pending' AND stripe_verification_session_id IS NULL THEN 4
    ELSE 5
  END;

-- 6. Liste complète de tous les testeurs avec leur statut
SELECT
  '=== TOUS LES TESTEURS (DÉTAIL COMPLET) ===' as section;

SELECT
  id,
  email,
  COALESCE(verification_status, 'unverified') as verification_status,
  is_verified,
  is_active,
  stripe_verification_session_id IS NOT NULL as has_stripe_session,
  verified_at,
  created_at,
  CASE
    WHEN is_active = false THEN '🚫 BANNI - Ne peut pas postuler'
    WHEN COALESCE(verification_status, 'unverified') = 'verified' AND is_active = true THEN '✅ Peut postuler aux campagnes'
    WHEN COALESCE(verification_status, 'unverified') = 'pending' THEN '⏳ Vérification en cours'
    WHEN COALESCE(verification_status, 'unverified') = 'failed' THEN '❌ Vérification échouée'
    ELSE '❌ Non vérifié - Ne peut pas postuler'
  END as etat_acces
FROM profiles
WHERE role = 'USER'
ORDER BY
  CASE
    WHEN is_active = false THEN 1
    WHEN COALESCE(verification_status, 'unverified') = 'verified' THEN 2
    WHEN COALESCE(verification_status, 'unverified') = 'pending' THEN 3
    WHEN COALESCE(verification_status, 'unverified') = 'failed' THEN 4
    ELSE 5
  END,
  created_at DESC;

-- 7. Résumé final
SELECT
  '=== RÉSUMÉ FINAL ===' as section;

SELECT
  COUNT(*) FILTER (WHERE role = 'USER') as total_testeurs,
  COUNT(*) FILTER (WHERE role = 'USER' AND verification_status = 'verified') as testeurs_verifies,
  COUNT(*) FILTER (WHERE role = 'USER' AND verification_status = 'pending') as testeurs_en_cours,
  COUNT(*) FILTER (WHERE role = 'USER' AND COALESCE(verification_status, 'unverified') = 'unverified') as testeurs_non_verifies,
  COUNT(*) FILTER (WHERE role = 'USER' AND verification_status = 'failed') as testeurs_echec,
  COUNT(*) FILTER (WHERE role = 'USER' AND is_active = false) as testeurs_bannis,
  COUNT(*) FILTER (WHERE role = 'USER' AND verification_status = 'verified' AND is_active = true) as testeurs_peuvent_postuler,
  COUNT(*) FILTER (
    WHERE role = 'USER' AND (
      (verification_status = 'verified' AND is_verified = false)
      OR (verification_status = 'pending' AND stripe_verification_session_id IS NULL)
      OR (verification_status = 'verified' AND verified_at IS NULL)
    )
  ) as incoherences_detectees
FROM profiles;
