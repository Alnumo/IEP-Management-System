#!/usr/bin/env node

/**
 * Supabase Connection Test Script
 * 
 * This script tests the Supabase connection by:
 * 1. Checking if environment variables are set
 * 2. Testing basic connection to Supabase
 * 3. Verifying database schema existence
 * 4. Testing authentication if credentials are available
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

async function testSupabaseConnection() {
  log('\n🔧 Supabase Connection Test', colors.bold)
  log('=' * 50)

  // 1. Check environment variables
  log('\n1. Checking Environment Variables...')
  
  // Try to read .env file if it exists
  try {
    const envPath = join(__dirname, '.env')
    const envContent = readFileSync(envPath, 'utf8')
    const envVars = {}
    
    envContent.split('\n').forEach(line => {
      const [key, value] = line.split('=')
      if (key && value) {
        envVars[key.trim()] = value.trim()
      }
    })
    
    process.env = { ...process.env, ...envVars }
    logInfo('Found .env file and loaded variables')
  } catch (error) {
    logWarning('No .env file found, checking system environment variables')
  }

  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
  const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY

  if (!supabaseUrl) {
    logError('VITE_SUPABASE_URL or SUPABASE_URL environment variable not found')
    logInfo('Please set your Supabase URL in your environment variables or .env file')
    return false
  } else {
    logSuccess(`Supabase URL found: ${supabaseUrl.substring(0, 30)}...`)
  }

  if (!supabaseAnonKey) {
    logError('VITE_SUPABASE_ANON_KEY or SUPABASE_ANON_KEY environment variable not found')
    logInfo('Please set your Supabase anonymous key in your environment variables or .env file')
    return false
  } else {
    logSuccess(`Supabase Anon Key found: ${supabaseAnonKey.substring(0, 20)}...`)
  }

  // 2. Test Supabase client creation
  log('\n2. Creating Supabase Client...')
  
  let supabase
  try {
    supabase = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true
      }
    })
    logSuccess('Supabase client created successfully')
  } catch (error) {
    logError(`Failed to create Supabase client: ${error.message}`)
    return false
  }

  // 3. Test basic connection
  log('\n3. Testing Basic Connection...')
  
  try {
    const { data, error } = await supabase.from('profiles').select('count').limit(1)
    
    if (error) {
      if (error.code === 'PGRST116') {
        logWarning('profiles table not found - this might be expected if database is not set up yet')
      } else {
        logError(`Connection error: ${error.message}`)
        logInfo(`Error code: ${error.code}`)
      }
    } else {
      logSuccess('Successfully connected to Supabase database')
    }
  } catch (error) {
    logError(`Connection test failed: ${error.message}`)
  }

  // 4. Check expected tables from SQL schema
  log('\n4. Checking Database Schema...')
  
  const expectedTables = [
    'profiles',
    'therapy_plans', 
    'plan_categories',
    'plan_sessions',
    'plan_templates'
  ]

  for (const table of expectedTables) {
    try {
      const { data, error } = await supabase.from(table).select('*').limit(1)
      
      if (error) {
        if (error.code === 'PGRST116') {
          logWarning(`Table '${table}' does not exist`)
        } else {
          logError(`Error accessing table '${table}': ${error.message}`)
        }
      } else {
        logSuccess(`Table '${table}' exists and is accessible`)
      }
    } catch (error) {
      logError(`Failed to check table '${table}': ${error.message}`)
    }
  }

  // 5. Test authentication
  log('\n5. Testing Authentication...')
  
  try {
    const { data: { user }, error } = await supabase.auth.getUser()
    
    if (error) {
      logWarning(`Auth check returned error: ${error.message}`)
    } else if (!user) {
      logInfo('No authenticated user (this is normal if not logged in)')
    } else {
      logSuccess(`Authenticated user found: ${user.email}`)
    }
  } catch (error) {
    logError(`Authentication test failed: ${error.message}`)
  }

  // 6. Provide setup recommendations
  log('\n6. Setup Recommendations...')
  
  logInfo('To fully set up your Supabase connection:')
  logInfo('  1. Ensure your .env file contains:')
  logInfo('     VITE_SUPABASE_URL=your_supabase_url')
  logInfo('     VITE_SUPABASE_ANON_KEY=your_supabase_anon_key')
  logInfo('  2. Run the SQL migration files in database/ folder')
  logInfo('  3. Set up Row Level Security (RLS) policies if needed')
  
  log('\n✅ Connection test completed!', colors.bold)
  return true
}

// Run the test
testSupabaseConnection().catch(error => {
  logError(`Test failed with error: ${error.message}`)
  process.exit(1)
})

