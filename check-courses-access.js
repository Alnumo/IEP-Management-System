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

async function checkCoursesAccess() {
  console.log('🔧 Checking Courses Table Access...')
  
  try {
    console.log('🔍 Testing courses table access...')
    const { data, error } = await supabase
      .from('courses')
      .select('*')
      .limit(5)
    
    if (error) {
      console.error('❌ Error accessing courses table:', error)
      
      if (error.code === 'PGRST116') {
        console.log('')
        console.log('📋 SOLUTION: Table not found in schema cache')
        console.log('1. Go to your Supabase Dashboard')
        console.log('2. Navigate to: Settings > API')
        console.log('3. Click "Refresh" to refresh the schema cache')
        console.log('4. Or execute this SQL to disable RLS temporarily:')
        console.log('   ALTER TABLE courses DISABLE ROW LEVEL SECURITY;')
      } else if (error.code === '42501') {
        console.log('')
        console.log('📋 SOLUTION: RLS (Row Level Security) is blocking access')
        console.log('1. Go to your Supabase Dashboard > SQL Editor')
        console.log('2. Run this SQL to disable RLS on courses table:')
        console.log('   ALTER TABLE courses DISABLE ROW LEVEL SECURITY;')
        console.log('   ALTER TABLE course_enrollments DISABLE ROW LEVEL SECURITY;')
        console.log('   ALTER TABLE course_sessions DISABLE ROW LEVEL SECURITY;')
        console.log('   ALTER TABLE instructors DISABLE ROW LEVEL SECURITY;')
      }
      return false
    }
    
    console.log('✅ Courses table is accessible!')
    console.log('📊 Found', data?.length || 0, 'courses')
    
    if (data && data.length > 0) {
      console.log('📋 Sample course:')
      const course = data[0]
      console.log('  - Code:', course.course_code)
      console.log('  - Name:', course.name_ar)
      console.log('  - Status:', course.status)
      console.log('  - Students:', course.enrolled_students + '/' + course.max_students)
    }
    
    return true
    
  } catch (error) {
    console.error('❌ Access check failed:', error.message)
    return false
  }
}

checkCoursesAccess().catch(console.error)