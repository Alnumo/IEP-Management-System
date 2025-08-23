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

async function testEnrollmentsQuery() {
  console.log('🔍 Testing enrollments query with updated column names...\n');
  
  const supabaseUrl = envVars.VITE_SUPABASE_URL;
  const supabaseKey = envVars.VITE_SUPABASE_ANON_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    console.log('❌ Missing Supabase credentials');
    return;
  }

  const supabase = createClient(supabaseUrl, supabaseKey);
  
  try {
    const { data, error } = await supabase
      .from('course_enrollments')
      .select(`
        *,
        student:students(
          id,
          registration_number,
          first_name_ar,
          last_name_ar,
          first_name_en,
          last_name_en,
          phone,
          email
        ),
        course:courses(
          id,
          course_code,
          name_ar,
          name_en,
          start_date,
          end_date,
          price,
          max_students
        )
      `)
      .limit(3);
      
    if (error) {
      console.log('❌ Error:', error.message);
      return;
    }
    
    console.log('✅ Enrollments query successful!');
    console.log('📊 Found', data.length, 'enrollments');
    
    if (data.length > 0) {
      console.log('📋 Sample enrollment structure:');
      data.forEach((enrollment, index) => {
        console.log(`  Enrollment ${index + 1}:`);
        console.log(`    ID: ${enrollment.id}`);
        console.log(`    Student: ${enrollment.student?.first_name_ar} ${enrollment.student?.last_name_ar}`);
        console.log(`    Registration #: ${enrollment.student?.registration_number || 'N/A'}`);
        console.log(`    Course: ${enrollment.course?.name_ar || 'No course'}`);
        console.log(`    Status: ${enrollment.status || 'N/A'}`);
        console.log('');
      });
    } else {
      console.log('📋 No enrollments found in database');
    }
    
  } catch (err) {
    console.log('❌ Failed to test enrollments query:', err.message);
  }
}

testEnrollmentsQuery();