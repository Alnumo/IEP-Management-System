#!/usr/bin/env node

/**
 * SQL File Combiner
 * 
 * This script combines all SQL migration files into a single file for easy execution.
 */

import { readFileSync, writeFileSync, readdirSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

function combineSqlFiles() {
  console.log('🔄 Combining SQL migration files...')

  const databaseDir = join(__dirname, '../database')
  const outputFile = join(__dirname, '../database/combined_migrations.sql')

  // Get migration files in order
  const migrationFiles = readdirSync(databaseDir)
    .filter(file => file.endsWith('.sql') && !file.includes('combined'))
    .sort()

  if (migrationFiles.length === 0) {
    console.log('❌ No SQL migration files found')
    return
  }

  console.log(`📁 Found ${migrationFiles.length} migration files:`)
  migrationFiles.forEach(file => console.log(`   - ${file}`))

  let combinedSql = `-- Combined Migration File
-- Generated on: ${new Date().toISOString()}
-- 
-- This file combines all migration files for easy execution in Supabase Dashboard
-- 
-- Instructions:
-- 1. Go to your Supabase Dashboard > SQL Editor
-- 2. Copy and paste this entire file content
-- 3. Click "Run" to execute all migrations
--
-- Files included: ${migrationFiles.join(', ')}
-- =====================================================================

`

  // Combine all SQL files
  migrationFiles.forEach((file, index) => {
    console.log(`📄 Processing ${file}...`)
    
    const filePath = join(databaseDir, file)
    const sqlContent = readFileSync(filePath, 'utf8')
    
    combinedSql += `-- =====================================================================
-- Migration ${index + 1}: ${file}
-- =====================================================================

${sqlContent}

-- End of ${file}

`
  })

  // Add verification queries at the end
  combinedSql += `
-- =====================================================================
-- Verification Queries (run these to check if setup was successful)
-- =====================================================================

-- Check if all tables were created
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('plan_categories', 'therapy_plans', 'plan_sessions', 'plan_templates', 'profiles')
ORDER BY table_name;

-- Check if sample data was inserted
SELECT COUNT(*) as categories_count FROM plan_categories;
SELECT COUNT(*) as plans_count FROM therapy_plans;

-- Success message
SELECT 'Database setup completed successfully!' as status;
`

  // Write combined file
  writeFileSync(outputFile, combinedSql, 'utf8')

  console.log('✅ Combined SQL file created successfully!')
  console.log(`📍 Location: ${outputFile}`)
  console.log('')
  console.log('🚀 Next steps:')
  console.log('1. Open your Supabase Dashboard > SQL Editor')
  console.log('2. Copy the content from database/combined_migrations.sql')
  console.log('3. Paste and run in the SQL Editor')
  console.log('4. Test your connection with: node test-supabase-connection.js')
}

// Run the script
combineSqlFiles()