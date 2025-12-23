import { SetMetadata } from '@nestjs/common';

/**
 * Clé de métadonnée pour le décorateur @RequireKyc
 */
export const REQUIRE_KYC_KEY = 'requireKyc';

/**
 * Décorateur pour marquer qu'une route nécessite une vérification KYC complétée
 *
 * Utilisation:
 * ```typescript
 * @Post('apply')
 * @RequireKyc()
 * @Roles('USER')
 * async applyToCampaign() {
 *   // Cette route nécessite que l'utilisateur ait verificationStatus === 'verified'
 * }
 * ```
 *
 * Note:
 * - Ce décorateur doit être utilisé avec KycVerifiedGuard
 * - Ne s'applique qu'aux utilisateurs avec role='USER' (testeurs)
 * - Les PRO et ADMIN ne sont pas soumis à cette vérification
 */
export const RequireKyc = () => SetMetadata(REQUIRE_KYC_KEY, true);
