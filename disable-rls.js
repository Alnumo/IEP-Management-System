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

async function disableRLS() {
  console.log('🔧 Temporarily disabling RLS on students table for testing...')
  
  try {
    // Test if we can access students table
    const { data: testData, error: testError } = await supabase
      .from('students')
      .select('count')
      .limit(1)
    
    if (testError) {
      console.error('❌ Cannot access students table:', testError.message)
      
      if (testError.code === '42501') {
        console.log('📝 RLS is currently blocking access. This is expected.')
        console.log('🎯 To fix this, you need to run this SQL in your Supabase Dashboard > SQL Editor:')
        console.log('')
        console.log('ALTER TABLE students DISABLE ROW LEVEL SECURITY;')
        console.log('')
        console.log('Or create an authenticated user with proper roles.')
      }
    } else {
      console.log('✅ Students table is accessible!')
      console.log('🔍 RLS might already be disabled or you have proper permissions.')
    }
    
    return true
  } catch (error) {
    console.error('❌ Error:', error.message)
    return false
  }
}

disableRLS().catch(console.error)