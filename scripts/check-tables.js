#!/usr/bin/env node

/**
 * Simple Database Table Checker
 * Directly queries the database to see what tables actually exist
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

async function checkTables() {
  console.log('🔍 Checking actual database tables...\n')

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
    console.error('❌ Could not load .env file')
    return
  }

  const supabaseUrl = process.env.VITE_SUPABASE_URL
  const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('❌ Missing Supabase environment variables')
    return
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey)

  // Check what tables exist
  console.log('📋 Checking table existence:')
  
  const testTables = [
    'plan_categories',
    'therapy_plans', 
    'plan_sessions',
    'plan_templates',
    'profiles'
  ]

  for (const table of testTables) {
    try {
      const { data, error, count } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true })

      if (error) {
        console.log(`❌ ${table}: ${error.message}`)
      } else {
        console.log(`✅ ${table}: EXISTS (${count || 0} rows)`)
      }
    } catch (error) {
      console.log(`❌ ${table}: ${error.message}`)
    }
  }

  // Try to get some actual data
  console.log('\n📊 Sample data check:')
  
  try {
    const { data: categories, error } = await supabase
      .from('plan_categories')
      .select('name_ar, name_en')
      .limit(3)

    if (error) {
      console.log('❌ Could not fetch categories:', error.message)
    } else if (categories && categories.length > 0) {
      console.log('✅ Sample categories found:')
      categories.forEach(cat => {
        console.log(`   - ${cat.name_ar} (${cat.name_en || 'No English'})`)
      })
    } else {
      console.log('⚠️ No category data found')
    }
  } catch (error) {
    console.log('❌ Error fetching sample data:', error.message)
  }

  // Check if we can query information_schema
  console.log('\n🔍 Checking system tables:')
  try {
    const { data, error } = await supabase.rpc('exec_sql', {
      sql_query: `
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
          AND table_type = 'BASE TABLE'
        ORDER BY table_name;
      `
    })

    if (error) {
      console.log('❌ Could not query system tables:', error.message)
    } else {
      console.log('✅ System query successful')
    }
  } catch (error) {
    console.log('⚠️ System query not available (normal for anon key)')
  }
}

checkTables().catch(error => {
  console.error('❌ Check failed:', error.message)
})