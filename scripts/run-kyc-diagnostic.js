#!/usr/bin/env node

/**
 * Script de diagnostic des sessions KYC
 * Usage: node scripts/run-kyc-diagnostic.js
 */

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Configuration de la connexion à la base de données
const pool = new Pool({
  connectionString: process.env.DIRECT_URL || 'postgresql://postgres.mdihnqriahzlqtrjexuy:1234@aws-1-eu-north-1.pooler.supabase.com:5432/postgres',
  ssl: {
    rejectUnauthorized: false
  }
});

async function runDiagnostic() {
  const client = await pool.connect();

  try {
    console.log('🔍 Démarrage du diagnostic des sessions KYC...\n');

    // Lire le fichier SQL
    const sqlFile = path.join(__dirname, 'check-kyc-sessions.sql');
    const sql = fs.readFileSync(sqlFile, 'utf8');

    // Diviser en requêtes individuelles (séparées par les SELECT '=== ... ===' as section)
    const queries = sql.split(/SELECT[\s\S]*?'=== .* ===' as section;/g).filter(q => q.trim());

    // Exécuter le diagnostic complet
    const result = await client.query(sql);

    // Afficher les résultats de manière formatée
    if (result && Array.isArray(result)) {
      result.forEach((queryResult, index) => {
        if (queryResult.rows && queryResult.rows.length > 0) {
          console.table(queryResult.rows);
          console.log('\n');
        }
      });
    } else if (result.rows && result.rows.length > 0) {
      console.table(result.rows);
    }

    console.log('✅ Diagnostic terminé avec succès\n');

  } catch (error) {
    console.error('❌ Erreur lors du diagnostic:', error.message);
    console.error(error);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

// Exécuter le diagnostic
runDiagnostic();
