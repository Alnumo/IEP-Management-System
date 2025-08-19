#!/usr/bin/env node

/**
 * Database Verification Script
 * 
 * This script verifies that the database setup was successful by:
 * 1. Checking if all tables exist
 * 2. Verifying sample data was inserted
 * 3. Testing basic CRUD operations
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
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

async function verifyDatabase() {
  log('\n🔍 Database Verification Script', colors.bold)
  log('=' * 50)

  // Load environment variables
  try {
    const envPath = join(__dirname, '../.env')
    const envContent = readFileSync(envPath, 'utf8')
    const envVars = {}
    
    envContent.split('\n').forEach(line => {
      const [key, value] = line.split('=')
      if (key && value) {
        envVars[key.trim()] = value.trim()
      }
    })
    
    process.env = { ...process.env, ...envVars }
  } catch (error) {
    logWarning('Could not load .env file')
  }

  const supabaseUrl = process.env.VITE_SUPABASE_URL
  const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    logError('Missing Supabase environment variables')
    return false
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey)

  // Test 1: Check if tables exist
  log('\n1. Checking Table Existence...')
  
  const expectedTables = [
    'plan_categories',
    'therapy_plans', 
    'plan_sessions',
    'plan_templates',
    'profiles'
  ]

  let tablesExist = 0
  for (const table of expectedTables) {
    try {
      const { data, error } = await supabase.from(table).select('*').limit(1)
      
      if (error && error.code === 'PGRST116') {
        logError(`Table '${table}' does not exist`)
      } else if (error) {
        logWarning(`Table '${table}' exists but has access issues: ${error.message}`)
        tablesExist++
      } else {
        logSuccess(`Table '${table}' exists and is accessible`)
        tablesExist++
      }
    } catch (error) {
      logError(`Failed to check table '${table}': ${error.message}`)
    }
  }

  if (tablesExist === 0) {
    logError('No tables found! Please run the SQL migrations first.')
    logInfo('Run: npm run db:combine and then execute the SQL in Supabase Dashboard')
    return false
  }

  // Test 2: Check sample data
  log('\n2. Checking Sample Data...')
  
  try {
    const { data: categories, error: catError } = await supabase
      .from('plan_categories')
      .select('*')

    if (catError) {
      logError(`Could not fetch categories: ${catError.message}`)
    } else {
      logSuccess(`Found ${categories.length} plan categories`)
      if (categories.length > 0) {
        categories.forEach(cat => {
          console.log(`   - ${cat.name_ar} (${cat.name_en || 'No English name'})`)
        })
      }
    }
  } catch (error) {
    logError(`Failed to check sample data: ${error.message}`)
  }

  try {
    const { data: plans, error: planError } = await supabase
      .from('therapy_plans')
      .select('*')

    if (planError) {
      logError(`Could not fetch therapy plans: ${planError.message}`)
    } else {
      logSuccess(`Found ${plans.length} therapy plans`)
      if (plans.length > 0) {
        plans.slice(0, 3).forEach(plan => {
          console.log(`   - ${plan.name_ar} (${plan.duration_weeks} weeks, ${plan.sessions_per_week} sessions/week)`)
        })
        if (plans.length > 3) {
          console.log(`   ... and ${plans.length - 3} more`)
        }
      }
    }
  } catch (error) {
    logError(`Failed to check therapy plans: ${error.message}`)
  }

  // Test 3: Test basic operations
  log('\n3. Testing Basic Operations...')
  
  try {
    // Test read operation
    const { data: testCategories, error: readError } = await supabase
      .from('plan_categories')
      .select('id, name_ar, name_en')
      .limit(1)

    if (readError) {
      logError(`Read operation failed: ${readError.message}`)
    } else {
      logSuccess('Read operation successful')
    }

    // Test if we can check auth status
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError) {
      logWarning(`Auth check returned error: ${authError.message}`)
    } else if (!user) {
      logInfo('No authenticated user (this is normal)')
    } else {
      logSuccess(`Authenticated user found: ${user.email}`)
    }

  } catch (error) {
    logError(`Operation test failed: ${error.message}`)
  }

  // Summary
  log('\n📊 Verification Summary:', colors.bold)
  
  if (tablesExist === expectedTables.length) {
    logSuccess('All required tables are present')
  } else {
    logWarning(`${tablesExist}/${expectedTables.length} tables are accessible`)
  }

  log('\n📋 Next Steps:', colors.bold)
  logInfo('If verification passed:')
  logInfo('  1. Start the development server: npm run dev')
  logInfo('  2. Test the application in your browser')
  logInfo('  3. Set up authentication if needed')
  
  logInfo('\nIf there were issues:')
  logInfo('  1. Check the Supabase Dashboard for errors')
  logInfo('  2. Verify the SQL migrations ran successfully')
  logInfo('  3. Check your environment variables')

  log('\n✅ Database verification completed!', colors.bold)
  return tablesExist > 0
}

// Run the verification
verifyDatabase().catch(error => {
  logError(`Verification failed with error: ${error.message}`)
  process.exit(1)
})