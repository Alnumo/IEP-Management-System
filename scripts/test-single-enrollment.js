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

async function testSingleEnrollmentQuery() {
  console.log('🔍 Testing single enrollment query...\n');
  
  const supabaseUrl = envVars.VITE_SUPABASE_URL;
  const supabaseKey = envVars.VITE_SUPABASE_ANON_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    console.log('❌ Missing Supabase credentials');
    return;
  }

  const supabase = createClient(supabaseUrl, supabaseKey);
  
  try {
    // First get an enrollment ID
    const { data: enrollments } = await supabase
      .from('course_enrollments')
      .select('id')
      .limit(1);
      
    if (!enrollments || enrollments.length === 0) {
      console.log('📋 No enrollments to test with');
      return;
    }
    
    const enrollmentId = enrollments[0].id;
    console.log('📋 Testing with enrollment ID:', enrollmentId);
    
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
          email,
          date_of_birth,
          city_ar
        ),
        course:courses(
          id,
          course_code,
          name_ar,
          name_en,
          description_ar,
          description_en,
          start_date,
          end_date,
          schedule_days,
          schedule_time,
          price,
          max_students,
          enrolled_students,
          therapist_name,
          location
        )
      `)
      .eq('id', enrollmentId)
      .single();
      
    if (error) {
      console.log('❌ Error:', error.message);
      return;
    }
    
    console.log('✅ Single enrollment query successful!');
    console.log('📋 Enrollment details:');
    console.log(`  Student: ${data.student?.first_name_ar} ${data.student?.last_name_ar}`);
    console.log(`  Registration #: ${data.student?.registration_number || 'N/A'}`);
    console.log(`  Course: ${data.course?.name_ar || 'No course'}`);
    console.log(`  Therapist: ${data.course?.therapist_name || 'Not assigned'}`);
    console.log(`  Status: ${data.status || 'N/A'}`);
    
  } catch (err) {
    console.log('❌ Failed to test single enrollment query:', err.message);
  }
}

testSingleEnrollmentQuery();