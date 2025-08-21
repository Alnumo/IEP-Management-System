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

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function checkRealCourses() {
  console.log('🔍 Getting real course IDs...')
  
  const { data: courses, error } = await supabase
    .from('courses')
    .select('id, course_code, name_ar')
  
  if (error) {
    console.error('❌ Error:', error)
    return
  }
  
  console.log('📚 Available courses:')
  courses.forEach(course => {
    console.log(`  - ID: ${course.id}`)
    console.log(`    Code: ${course.course_code}`)
    console.log(`    Name: ${course.name_ar}`)
    console.log('')
  })
  
  if (courses.length > 0) {
    // Test with real course ID
    const realCourseId = courses[0].id
    console.log(`🔍 Testing session creation with real course ID: ${realCourseId}`)
    
    const testSessionData = {
      course_id: realCourseId,
      session_number: 1,
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
    } else {
      console.log('✅ Test session created successfully!')
      console.log('📋 Session data:', insertData[0])
      
      // Clean up
      await supabase
        .from('course_sessions')
        .delete()
        .eq('id', insertData[0].id)
      console.log('🧹 Test session cleaned up')
    }
  }
}

checkRealCourses().catch(console.error)