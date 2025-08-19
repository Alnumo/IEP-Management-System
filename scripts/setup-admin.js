#!/usr/bin/env node

/**
 * Create Admin User for Testing
 * This script creates an admin user in the Supabase Auth system
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

async function setupAdmin() {
  console.log('🔧 Setting up admin user...\n')

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

  console.log('📝 Instructions for setting up admin user:')
  console.log('1. Go to your Supabase Dashboard: https://app.supabase.com')
  console.log('2. Select your project: oqolbghmaxavxpoeipdf')
  console.log('3. Go to Authentication > Users')
  console.log('4. Click "Add user" and create a user with these details:')
  console.log('   - Email: admin@arkan-center.com')
  console.log('   - Password: Admin123!')
  console.log('   - Auto Confirm User: YES')
  console.log('   - User Metadata (JSON):')
  console.log('     {')
  console.log('       "name": "Admin User",')
  console.log('       "role": "admin"')
  console.log('     }')
  
  console.log('\n5. After creating the user, go to SQL Editor and run:')
  console.log(`
UPDATE profiles 
SET role = 'admin', name = 'Admin User'
WHERE email = 'admin@arkan-center.com';
  `)

  // Test current authentication status
  console.log('\n🔍 Current auth status:')
  const { data: { user } } = await supabase.auth.getUser()
  
  if (user) {
    console.log('✅ User is logged in:', user.email)
    
    // Check user role
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, name')
      .eq('id', user.id)
      .single()
    
    if (profile) {
      console.log('👤 User role:', profile.role)
      console.log('📝 User name:', profile.name)
    }
  } else {
    console.log('❌ No user is currently logged in')
    console.log('\n🔗 You can test login at: http://localhost:5176')
    console.log('Or implement a simple login form for testing')
  }
}

setupAdmin().catch(error => {
  console.error('❌ Setup failed:', error.message)
})