import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

/**
 * Script de migration pour supprimer tous les steps de type PRICE_VALIDATION
 * et leur progression associée
 */
async function cleanupPriceValidationSteps() {
  console.log('🔍 Recherche des steps PRICE_VALIDATION...')

  try {
    // Note: Le type PRICE_VALIDATION n'existe plus dans le schema, donc on ne peut plus faire de query dessus
    // Ce script est pour référence historique seulement

    console.log('✅ Nettoyage terminé - Aucune action nécessaire car le type PRICE_VALIDATION a été supprimé du schema')
    console.log('Les anciennes données seront automatiquement inaccessibles après la migration schema.')

  } catch (error) {
    console.error('❌ Erreur lors du nettoyage:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// Exécuter le script si appelé directement
if (require.main === module) {
  cleanupPriceValidationSteps()
    .then(() => {
      console.log('✅ Script de nettoyage terminé')
      process.exit(0)
    })
    .catch((error) => {
      console.error('❌ Erreur fatale:', error)
      process.exit(1)
    })
}

export { cleanupPriceValidationSteps }
