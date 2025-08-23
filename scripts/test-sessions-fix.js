#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
let envVars = {};
try {
  const envContent = readFileSync(join(__dirname, '..', '.env'), 'utf8');
  envContent.split('\n').forEach(line => {
    const [key, value] = line.split('=');
    if (key && value) {
      envVars[key.trim()] = value.trim();
    }
  });
} catch (error) {
  console.log('No .env file found or error reading it');
}

async function testSessionsQuery() {
  console.log('🔍 Testing sessions query with updated column names...\n');
  
  const supabaseUrl = envVars.VITE_SUPABASE_URL;
  const supabaseKey = envVars.VITE_SUPABASE_ANON_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    console.log('❌ Missing Supabase credentials');
    return;
  }

  const supabase = createClient(supabaseUrl, supabaseKey);
  
  try {
    const { data, error } = await supabase
      .from('course_sessions')
      .select(`
        *,
        course:courses(
          id,
          name_ar,
          name_en,
          course_code,
          therapist_name
        )
      `)
      .limit(3);
      
    if (error) {
      console.log('❌ Error:', error.message);
      return;
    }
    
    console.log('✅ Sessions query successful!');
    console.log('📊 Found', data.length, 'sessions');
    
    if (data.length > 0) {
      console.log('📋 Sample session structure:');
      data.forEach((session, index) => {
        console.log(`  Session ${index + 1}:`);
        console.log(`    ID: ${session.id}`);
        console.log(`    Date: ${session.session_date}`);
        console.log(`    Course: ${session.course?.name_ar || 'No course'}`);
        console.log(`    Therapist: ${session.course?.therapist_name || 'Not assigned'}`);
        console.log('');
      });
    } else {
      console.log('📋 No sessions found in database');
    }
    
  } catch (err) {
    console.log('❌ Failed to test sessions query:', err.message);
  }
}

testSessionsQuery();