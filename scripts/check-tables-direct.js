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

async function checkTables() {
  const supabaseUrl = envVars.VITE_SUPABASE_URL;
  const supabaseKey = envVars.VITE_SUPABASE_ANON_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    console.log('❌ Missing Supabase credentials');
    return;
  }

  console.log('🔍 Checking tables directly in Supabase...\n');
  
  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    const tablesToCheck = [
      'students', 'profiles', 'therapy_plans', 'plan_categories',
      'medical_records', 'medical_consultants', 'clinical_documentation',
      'therapy_programs', 'aba_data_collection', 'speech_therapy_data',
      'soap_templates', 'assessment_results', 'progress_tracking'
    ];

    for (const tableName of tablesToCheck) {
      try {
        const { data, error: tableError } = await supabase
          .from(tableName)
          .select('*')
          .limit(1);
        
        if (tableError) {
          console.log(`❌ ${tableName}: ${tableError.message}`);
        } else {
          console.log(`✅ ${tableName}: exists`);
        }
      } catch (err) {
        console.log(`❌ ${tableName}: ${err.message}`);
      }
    }

  } catch (err) {
    console.log('❌ Error:', err.message);
  }
}

checkTables();