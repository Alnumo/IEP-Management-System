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

async function checkSessionsAccess() {
  console.log('🔧 Checking Sessions Table Access...')
  
  try {
    console.log('🔍 Testing course_sessions table access...')
    const { data, error } = await supabase
      .from('course_sessions')
      .select('*')
      .limit(5)
    
    if (error) {
      console.error('❌ Error accessing course_sessions table:', error)
      
      if (error.code === 'PGRST116') {
        console.log('')
        console.log('📋 SOLUTION: Table not found in schema cache')
        console.log('1. Go to your Supabase Dashboard')
        console.log('2. Navigate to: Settings > API')
        console.log('3. Click "Refresh" to refresh the schema cache')
        console.log('4. Or execute this SQL to disable RLS temporarily:')
        console.log('   ALTER TABLE course_sessions DISABLE ROW LEVEL SECURITY;')
      } else if (error.code === '42501') {
        console.log('')
        console.log('📋 SOLUTION: RLS (Row Level Security) is blocking access')
        console.log('1. Go to your Supabase Dashboard > SQL Editor')
        console.log('2. Run this SQL to disable RLS on course_sessions table:')
        console.log('   ALTER TABLE course_sessions DISABLE ROW LEVEL SECURITY;')
      }
      return false
    }
    
    console.log('✅ Course_sessions table is accessible!')
    console.log('📊 Found', data?.length || 0, 'sessions')
    
    if (data && data.length > 0) {
      console.log('📋 Sample session:', data[0])
    }
    
    // Test session creation
    console.log('\n🔍 Testing session creation...')
    const testSessionData = {
      course_id: '7c41e8b5-8c91-4a97-b8f1-4d5e6f789012', // Use one of the existing course IDs
      session_number: 999,
      session_date: '2024-12-31',
      session_time: '10:00-12:00',
      duration_minutes: 120,
      topic_ar: 'جلسة تجريبية',
      topic_en: 'Test Session',
      objectives: ['Test objective'],
      materials_needed: ['Test material'],
      status: 'scheduled'
    }
    
    const { data: insertData, error: insertError } = await supabase
      .from('course_sessions')
      .insert([testSessionData])
      .select('*')
    
    if (insertError) {
      console.error('❌ Error creating test session:', insertError)
      return false
    }
    
    console.log('✅ Test session created successfully:', insertData[0])
    
    // Clean up test session
    if (insertData && insertData[0]) {
      await supabase
        .from('course_sessions')
        .delete()
        .eq('id', insertData[0].id)
      console.log('🧹 Test session cleaned up')
    }
    
    return true
    
  } catch (error) {
    console.error('❌ Access check failed:', error.message)
    return false
  }
}

checkSessionsAccess().catch(console.error)