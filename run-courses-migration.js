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
  console.error('❌ Missing Supabase environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function runCoursesMigration() {
  console.log('🔧 Running Courses Migration...')
  console.log('📍 Supabase URL:', supabaseUrl.substring(0, 30) + '...')
  
  try {
    // Test if courses table already exists
    console.log('🔍 Checking if courses table exists...')
    const { data: testData, error: testError } = await supabase
      .from('courses')
      .select('count')
      .limit(1)
    
    if (!testError) {
      console.log('✅ Courses table already exists!')
      console.log('📊 You can now use the courses management system.')
      return true
    }
    
    if (testError.code === 'PGRST116') {
      console.log('❌ Courses table does not exist. You need to run the migration.')
      console.log('')
      console.log('📋 TO FIX THIS ISSUE:')
      console.log('1. Open your Supabase Dashboard')
      console.log('2. Go to SQL Editor')
      console.log('3. Copy and paste the content from: database/011_create_courses_system.sql')
      console.log('4. Click "Run" to execute the migration')
      console.log('')
      console.log('🔗 Supabase Dashboard: ' + supabaseUrl.replace('/rest/v1', ''))
      return false
    }
    
    console.error('❌ Unexpected error:', testError)
    return false
    
  } catch (error) {
    console.error('❌ Migration check failed:', error.message)
    return false
  }
}

runCoursesMigration().catch(console.error)