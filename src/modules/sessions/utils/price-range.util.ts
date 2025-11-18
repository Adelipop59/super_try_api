import { Decimal } from '@prisma/client/runtime/library';

/**
 * Interface pour la tranche de prix
 */
export interface PriceRange {
  min: number;
  max: number;
}

/**
 * Calcule la tranche de prix acceptable pour un produit
 *
 * Règles :
 * - Produit >= 5€ : [prix - 5€, prix + 5€]
 * - Produit < 5€ : [0€, 5€]
 *
 * @param productPrice Prix exact du produit (peut être Decimal ou number)
 * @returns Tranche de prix {min, max}
 *
 * @example
 * calculatePriceRange(50) // { min: 45, max: 55 }
 * calculatePriceRange(3)  // { min: 0, max: 5 }
 * calculatePriceRange(100) // { min: 95, max: 105 }
 */
export function calculatePriceRange(
  productPrice: Decimal | number,
): PriceRange {
  // Convertir Decimal en number si nécessaire
  const price =
    typeof productPrice === 'number' ? productPrice : Number(productPrice);

  // Exception : produits à moins de 5€
  if (price < 5) {
    return {
      min: 0,
      max: 5,
    };
  }

  // Règle standard : ±5€
  return {
    min: price - 5,
    max: price + 5,
  };
}

/**
 * Vérifie si un prix entré est dans la tranche acceptable
 *
 * @param enteredPrice Prix saisi par le testeur
 * @param expectedPrice Prix exact du produit
 * @returns true si le prix est dans la fourchette, false sinon
 *
 * @example
 * isPriceInRange(49.90, 50) // true (dans [45, 55])
 * isPriceInRange(60, 50)    // false (hors [45, 55])
 * isPriceInRange(4, 3)      // true (dans [0, 5])
 */
export function isPriceInRange(
  enteredPrice: number,
  expectedPrice: Decimal | number,
): boolean {
  const range = calculatePriceRange(expectedPrice);
  return enteredPrice >= range.min && enteredPrice <= range.max;
}

/**
 * Formate une tranche de prix pour l'affichage
 *
 * @param productPrice Prix exact du produit
 * @returns String formatté "XX€ - YY€"
 *
 * @example
 * formatPriceRange(50) // "45€ - 55€"
 * formatPriceRange(3)  // "0€ - 5€"
 */
export function formatPriceRange(productPrice: Decimal | number): string {
  const range = calculatePriceRange(productPrice);
  return `${range.min.toFixed(2)}€ - ${range.max.toFixed(2)}€`;
}
