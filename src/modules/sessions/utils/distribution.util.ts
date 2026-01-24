import { DistributionType } from '@prisma/client';

interface Distribution {
  id: string;
  type: DistributionType;
  dayOfWeek?: number | null;
  specificDate?: Date | null;
  maxUnits: number;
}

interface DistributionSlot {
  distributionId: string;
  date: Date;
  maxUnits: number;
  usedUnits: number;
}

/**
 * Calcule la prochaine date d'achat basée sur les distributions de la campagne
 *
 * NOUVELLE LOGIQUE :
 * - Assigne intelligemment les testeurs aux dates disponibles
 * - Respecte les maxUnits de chaque distribution
 * - Distribue équitablement les testeurs sur toutes les dates
 *
 * @param distributions - Tableau des distributions de la campagne
 * @param campaignId - ID de la campagne
 * @param prismaClient - Client Prisma pour compter les sessions existantes
 * @param fromDate - Date de référence (par défaut : maintenant)
 * @returns La prochaine date d'achat avec capacité, ou null si aucune distribution n'est applicable
 */
export async function calculateNextPurchaseDateSmart(
  distributions: Distribution[],
  campaignId: string,
  prismaClient: any,
  fromDate: Date = new Date(),
): Promise<Date | null> {
  if (!distributions || distributions.length === 0) {
    return null;
  }

  // Construire les slots disponibles
  const slots: DistributionSlot[] = [];

  for (const distribution of distributions) {
    const dates: Date[] = [];

    if (
      distribution.type === DistributionType.RECURRING &&
      distribution.dayOfWeek !== null &&
      distribution.dayOfWeek !== undefined
    ) {
      // Pour RECURRING: générer les 4 prochaines occurrences
      for (let i = 0; i < 4; i++) {
        const nextDate = getNextDayOfWeek(fromDate, distribution.dayOfWeek, i);
        dates.push(nextDate);
      }
    } else if (
      distribution.type === DistributionType.SPECIFIC_DATE &&
      distribution.specificDate
    ) {
      const specificDate = new Date(distribution.specificDate);
      specificDate.setUTCHours(0, 0, 0, 0);

      // Vérifier que la date est dans le futur
      if (specificDate > fromDate) {
        dates.push(specificDate);
      }
    }

    // Ajouter chaque date comme slot
    for (const date of dates) {
      slots.push({
        distributionId: distribution.id,
        date,
        maxUnits: distribution.maxUnits,
        usedUnits: 0,
      });
    }
  }

  if (slots.length === 0) {
    return null;
  }

  // Compter combien de testeurs sont déjà assignés à chaque date
  for (const slot of slots) {
    const count = await prismaClient.session.count({
      where: {
        campaignId,
        scheduledPurchaseDate: slot.date,
        status: {
          in: [
            'ACCEPTED',
            'PRICE_VALIDATED',
            'PROCEDURES_COMPLETED',
            'PURCHASE_SUBMITTED',
            'PURCHASE_VALIDATED',
            'IN_PROGRESS',
          ],
        },
      },
    });
    slot.usedUnits = count;
  }

  // Filtrer les slots qui ont encore de la capacité
  const availableSlots = slots.filter((s) => s.usedUnits < s.maxUnits);

  if (availableSlots.length === 0) {
    return null;
  }

  // Trier par:
  // 1. Date la plus proche
  // 2. Slot le moins rempli (pour équilibrer)
  availableSlots.sort((a, b) => {
    const dateCompare = a.date.getTime() - b.date.getTime();
    if (dateCompare !== 0) return dateCompare;

    // Si même date, prendre le moins rempli
    const fillRateA = a.usedUnits / a.maxUnits;
    const fillRateB = b.usedUnits / b.maxUnits;
    return fillRateA - fillRateB;
  });

  return availableSlots[0].date;
}

/**
 * Calcule la prochaine date d'achat basée sur les distributions de la campagne
 *
 * ANCIENNE LOGIQUE (SIMPLE) :
 * - Retourne simplement la prochaine date disponible
 * - Ne prend PAS en compte les maxUnits
 * - Tous les testeurs reçoivent la même date
 *
 * @param distributions - Tableau des distributions de la campagne
 * @param fromDate - Date de référence (par défaut : maintenant)
 * @returns La prochaine date d'achat, ou null si aucune distribution n'est applicable
 * @deprecated Utiliser calculateNextPurchaseDateSmart à la place
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
    if (
      distribution.type === DistributionType.RECURRING &&
      distribution.dayOfWeek !== null &&
      distribution.dayOfWeek !== undefined
    ) {
      // Calculer le prochain jour de la semaine
      const nextDate = getNextDayOfWeek(fromDate, distribution.dayOfWeek);
      possibleDates.push(nextDate);
    } else if (
      distribution.type === DistributionType.SPECIFIC_DATE &&
      distribution.specificDate
    ) {
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
 * @param occurrenceOffset - Nombre de semaines à avancer (0 = cette semaine ou prochaine, 1 = semaine suivante, etc.)
 * @returns La prochaine date correspondant au jour de la semaine
 */
function getNextDayOfWeek(
  fromDate: Date,
  targetDayOfWeek: number,
  occurrenceOffset: number = 0,
): Date {
  const currentDayOfWeek = fromDate.getUTCDay();

  let daysUntilTarget = targetDayOfWeek - currentDayOfWeek;

  // Si le jour cible est AVANT aujourd'hui, passer à la semaine prochaine
  // MAIS si c'est AUJOURD'HUI et que c'est la première occurrence (offset=0), on le garde
  if (daysUntilTarget < 0) {
    daysUntilTarget += 7;
  } else if (daysUntilTarget === 0 && occurrenceOffset > 0) {
    // Si c'est aujourd'hui mais qu'on veut une occurrence future, passer à la semaine prochaine
    daysUntilTarget = 7;
  }

  // Ajouter les semaines supplémentaires
  daysUntilTarget += occurrenceOffset * 7;

  const nextDate = new Date(fromDate);
  nextDate.setUTCDate(nextDate.getUTCDate() + daysUntilTarget);

  // Réinitialiser l'heure à minuit UTC pour avoir une date propre
  nextDate.setUTCHours(0, 0, 0, 0);

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

  // Créer des dates à minuit UTC pour comparer seulement les jours
  const scheduledDay = new Date(scheduledDate);
  scheduledDay.setUTCHours(0, 0, 0, 0);

  const currentDay = new Date(currentDate);
  currentDay.setUTCHours(0, 0, 0, 0);

  // Vérifier si c'est le même jour
  return scheduledDay.getTime() === currentDay.getTime();
}

/**
 * Vérifie si la deadline d'achat est dépassée
 * La deadline est à 23:59:59 du jour prévu
 *
 * @param scheduledDate - Date prévue pour l'achat
 * @param currentDate - Date actuelle (par défaut : maintenant)
 * @returns true si la deadline est dépassée, false sinon
 */
export function isPurchaseDeadlineExpired(
  scheduledDate: Date,
  currentDate: Date = new Date(),
): boolean {
  if (!scheduledDate) {
    return false;
  }

  // Créer la deadline: fin du jour prévu (23:59:59 UTC)
  const deadline = new Date(scheduledDate);
  deadline.setUTCHours(23, 59, 59, 999);

  return currentDate > deadline;
}

/**
 * Calcule le temps restant avant la deadline d'achat
 *
 * @param scheduledDate - Date prévue pour l'achat
 * @param currentDate - Date actuelle (par défaut : maintenant)
 * @returns Objet avec les heures et minutes restantes, ou null si deadline passée
 */
export function getTimeUntilDeadline(
  scheduledDate: Date,
  currentDate: Date = new Date(),
): { hours: number; minutes: number; isUrgent: boolean } | null {
  if (!scheduledDate) {
    return null;
  }

  // Créer la deadline: fin du jour prévu (23:59:59 UTC)
  const deadline = new Date(scheduledDate);
  deadline.setUTCHours(23, 59, 59, 999);

  const diffMs = deadline.getTime() - currentDate.getTime();

  if (diffMs <= 0) {
    return null; // Deadline passée
  }

  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
  const isUrgent = hours < 24; // Urgent si moins de 24h

  return { hours, minutes, isUrgent };
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

/**
 * Calcule les informations complètes sur la deadline d'achat pour le frontend
 *
 * @param scheduledDate - Date programmée pour l'achat
 * @param currentDate - Date actuelle (par défaut : maintenant)
 * @returns Objet avec toutes les informations sur la deadline
 */
export function calculateDeadlineInfo(
  scheduledDate: Date | null,
  currentDate: Date = new Date(),
): {
  scheduledDate: Date;
  deadline: Date;
  isPast: boolean;
  isToday: boolean;
  isUrgent: boolean;
  hoursRemaining: number | null;
  minutesRemaining: number | null;
  formattedDate: string;
} | null {
  if (!scheduledDate) {
    return null;
  }

  // Créer la deadline: fin du jour prévu (23:59:59 UTC)
  const deadline = new Date(scheduledDate);
  deadline.setUTCHours(23, 59, 59, 999);

  // Vérifier si c'est passé
  const isPast = currentDate > deadline;

  // Vérifier si c'est aujourd'hui (en UTC)
  const scheduledDay = new Date(scheduledDate);
  scheduledDay.setUTCHours(0, 0, 0, 0);
  const currentDay = new Date(currentDate);
  currentDay.setUTCHours(0, 0, 0, 0);
  const isToday = scheduledDay.getTime() === currentDay.getTime();

  // Calculer le temps restant
  const timeRemaining = getTimeUntilDeadline(scheduledDate, currentDate);
  const hoursRemaining = timeRemaining?.hours ?? null;
  const minutesRemaining = timeRemaining?.minutes ?? null;
  const isUrgent = timeRemaining?.isUrgent ?? false;

  return {
    scheduledDate,
    deadline,
    isPast,
    isToday,
    isUrgent,
    hoursRemaining,
    minutesRemaining,
    formattedDate: formatDate(scheduledDate),
  };
}
