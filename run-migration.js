#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Read environment variables
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
} catch (error) {
  console.log('No .env file found, using system environment variables')
}

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function runMigration() {
  console.log('🔧 Running migration: Add therapy_program_id to students table...')
  
  try {
    // Read the migration file
    const migrationPath = join(__dirname, 'database', '008_add_therapy_program_id.sql')
    const migrationSQL = readFileSync(migrationPath, 'utf8')
    
    console.log('📄 Migration SQL:')
    console.log(migrationSQL)
    
    // Execute the migration
    const { data, error } = await supabase.rpc('exec_sql', { sql: migrationSQL })
    
    if (error) {
      console.error('❌ Migration failed:', error)
      return false
    }
    
    console.log('✅ Migration completed successfully!')
    
    // Test if the column was added
    console.log('🔍 Testing if column was added...')
    const { data: testData, error: testError } = await supabase
      .from('students')
      .select('therapy_program_id')
      .limit(1)
    
    if (testError) {
      console.error('❌ Column test failed:', testError)
    } else {
      console.log('✅ Column therapy_program_id is now available!')
    }
    
    return true
  } catch (error) {
    console.error('❌ Migration failed with error:', error.message)
    return false
  }
}

runMigration().catch(console.error)