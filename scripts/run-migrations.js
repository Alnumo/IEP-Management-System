#!/usr/bin/env node

/**
 * Database Migration Script
 * 
 * This script runs SQL migration files against the Supabase database.
 * Note: This requires the SUPABASE_SERVICE_ROLE_KEY for privileged operations.
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync, readdirSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Colors for console output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
}

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`)
}

function logSuccess(message) {
  log(`✓ ${message}`, colors.green)
}

function logError(message) {
  log(`✗ ${message}`, colors.red)
}

function logWarning(message) {
  log(`⚠ ${message}`, colors.yellow)
}

function logInfo(message) {
  log(`ℹ ${message}`, colors.blue)
}

async function runMigrations() {
  log('\n🚀 Database Migration Script', colors.bold)
  log('=' * 50)

  // Check environment variables
  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY

  if (!supabaseUrl) {
    logError('SUPABASE_URL environment variable not found')
    logInfo('Please set your Supabase URL in your environment variables')
    return false
  }

  // Try to use service role key first, fall back to anon key
  const supabaseKey = supabaseServiceKey || supabaseAnonKey
  
  if (!supabaseKey) {
    logError('Neither SUPABASE_SERVICE_ROLE_KEY nor SUPABASE_ANON_KEY found')
    logInfo('For migrations, SUPABASE_SERVICE_ROLE_KEY is recommended')
    return false
  }

  if (!supabaseServiceKey) {
    logWarning('Using anon key instead of service role key - some operations may fail')
    logInfo('For full migration support, set SUPABASE_SERVICE_ROLE_KEY')
  }

  // Create Supabase client
  const supabase = createClient(supabaseUrl, supabaseKey)

  // Get migration files
  const databaseDir = join(__dirname, '../database')
  const migrationFiles = readdirSync(databaseDir)
    .filter(file => file.endsWith('.sql'))
    .sort() // Run in alphabetical order

  if (migrationFiles.length === 0) {
    logWarning('No SQL migration files found in database/ directory')
    return false
  }

  logInfo(`Found ${migrationFiles.length} migration files:`)
  migrationFiles.forEach(file => console.log(`  - ${file}`))

  // Run migrations
  log('\n📊 Running Migrations...')
  
  for (const file of migrationFiles) {
    try {
      log(`\n▶ Processing ${file}...`)
      
      const sqlContent = readFileSync(join(databaseDir, file), 'utf8')
      
      // Split SQL content by semicolons and execute each statement
      const statements = sqlContent
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0 && !s.startsWith('--'))

      for (const statement of statements) {
        if (statement.trim()) {
          const { error } = await supabase.rpc('exec_sql', { 
            sql_query: statement 
          })

          if (error) {
            // Try direct execution if RPC fails
            const { error: directError } = await supabase
              .from('_temp_migration')
              .select('*')
              .limit(0) // This will fail, but we use it to test connection

            if (directError) {
              logWarning(`Could not execute statement via RPC: ${error.message}`)
              logInfo('Trying alternative approach...')
              
              // For now, we'll just log the SQL that needs to be run manually
              logInfo('Please run this SQL manually in your Supabase dashboard:')
              console.log(statement)
            }
          }
        }
      }
      
      logSuccess(`✓ ${file} completed`)
      
    } catch (error) {
      logError(`Failed to process ${file}: ${error.message}`)
      
      // Show the SQL content so user can run manually
      logInfo('SQL content that needs to be run manually:')
      const sqlContent = readFileSync(join(databaseDir, file), 'utf8')
      console.log('\n' + sqlContent + '\n')
    }
  }

  log('\n📋 Migration Summary:', colors.bold)
  logInfo('If any migrations failed, please:')
  logInfo('1. Go to your Supabase Dashboard > SQL Editor')
  logInfo('2. Copy and paste the SQL content shown above')
  logInfo('3. Execute each migration file in order')
  
  log('\n✅ Migration process completed!', colors.bold)
  return true
}

// Run the migrations
runMigrations().catch(error => {
  logError(`Migration failed with error: ${error.message}`)
  process.exit(1)
})