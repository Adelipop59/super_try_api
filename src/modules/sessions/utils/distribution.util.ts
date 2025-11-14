import { DistributionType } from '@prisma/client';

interface Distribution {
  type: DistributionType;
  dayOfWeek?: number | null;
  specificDate?: Date | null;
}

/**
 * Calcule la prochaine date d'achat basée sur les distributions de la campagne
 *
 * Règles :
 * - RECURRING : Prochaine occurrence du jour de la semaine spécifié
 *   Exemple : dayOfWeek = 1 (Lundi) → prochain lundi
 *
 * - SPECIFIC_DATE : La date spécifique si elle est dans le futur
 *   Sinon retourne null (date passée)
 *
 * @param distributions - Tableau des distributions de la campagne
 * @param fromDate - Date de référence (par défaut : maintenant)
 * @returns La prochaine date d'achat, ou null si aucune distribution n'est applicable
 */
export function calculateNextPurchaseDate(
  distributions: Distribution[],
  fromDate: Date = new Date(),
): Date | null {
  if (!distributions || distributions.length === 0) {
    return null;
  }

  const possibleDates: Date[] = [];

  for (const distribution of distributions) {
    if (distribution.type === DistributionType.RECURRING && distribution.dayOfWeek !== null && distribution.dayOfWeek !== undefined) {
      // Calculer le prochain jour de la semaine
      const nextDate = getNextDayOfWeek(fromDate, distribution.dayOfWeek);
      possibleDates.push(nextDate);
    } else if (distribution.type === DistributionType.SPECIFIC_DATE && distribution.specificDate) {
      // Vérifier que la date spécifique est dans le futur
      const specificDate = new Date(distribution.specificDate);
      if (specificDate > fromDate) {
        possibleDates.push(specificDate);
      }
    }
  }

  // Retourner la date la plus proche
  if (possibleDates.length === 0) {
    return null;
  }

  return possibleDates.sort((a, b) => a.getTime() - b.getTime())[0];
}

/**
 * Calcule le prochain jour de la semaine à partir d'une date donnée
 *
 * @param fromDate - Date de référence
 * @param targetDayOfWeek - Jour de la semaine cible (0 = Dimanche, 1 = Lundi, ..., 6 = Samedi)
 * @returns La prochaine date correspondant au jour de la semaine
 */
function getNextDayOfWeek(fromDate: Date, targetDayOfWeek: number): Date {
  const currentDayOfWeek = fromDate.getDay();

  let daysUntilTarget = targetDayOfWeek - currentDayOfWeek;

  // Si le jour cible est aujourd'hui ou avant, passer à la semaine prochaine
  if (daysUntilTarget <= 0) {
    daysUntilTarget += 7;
  }

  const nextDate = new Date(fromDate);
  nextDate.setDate(nextDate.getDate() + daysUntilTarget);

  // Réinitialiser l'heure à minuit pour avoir une date propre
  nextDate.setHours(0, 0, 0, 0);

  return nextDate;
}

/**
 * Vérifie si la date d'achat est valide (jour actuel)
 * Avec une tolérance de +/- 12 heures pour permettre les achats
 *
 * @param scheduledDate - Date prévue pour l'achat
 * @param currentDate - Date actuelle (par défaut : maintenant)
 * @returns true si l'achat peut être effectué, false sinon
 */
export function isValidPurchaseDate(
  scheduledDate: Date,
  currentDate: Date = new Date(),
): boolean {
  if (!scheduledDate) {
    return false;
  }

  // Créer des dates à minuit pour comparer seulement les jours
  const scheduledDay = new Date(scheduledDate);
  scheduledDay.setHours(0, 0, 0, 0);

  const currentDay = new Date(currentDate);
  currentDay.setHours(0, 0, 0, 0);

  // Vérifier si c'est le même jour
  return scheduledDay.getTime() === currentDay.getTime();
}

/**
 * Formate une date pour l'affichage (format français)
 *
 * @param date - Date à formater
 * @returns Date formatée (ex: "15/11/2025")
 */
export function formatDate(date: Date): string {
  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const year = date.getFullYear();

  return `${day}/${month}/${year}`;
}
