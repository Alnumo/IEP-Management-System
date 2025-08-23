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

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

console.log(`${colors.bright}${colors.cyan}
🔍 Complete Database Schema Verification${colors.reset}
${colors.reset}NaN${colors.reset}
`);

const supabaseUrl = envVars.VITE_SUPABASE_URL;
const supabaseKey = envVars.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.log(`${colors.red}❌ Missing Supabase credentials in .env file${colors.reset}`);
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// All tables that should exist after our migrations
const expectedTables = {
  // Original tables
  core: ['profiles', 'therapy_plans', 'plan_categories', 'plan_sessions', 'plan_templates'],
  
  // Student management tables
  students: ['students', 'parents', 'student_parents', 'emergency_contacts', 'student_documents', 'medical_history', 'student_therapy_plans', 'student_assessments'],
  
  // Medical foundation tables
  medical: ['medical_records', 'medical_consultants', 'clinical_documentation', 'medical_supervision_assignments'],
  
  // Specialized therapy programs
  therapy: ['therapy_programs', 'aba_data_collection', 'speech_therapy_data', 'occupational_therapy_data', 'assessment_tools', 'intervention_protocols', 'program_enrollments'],
  
  // Assessment and clinical documentation
  assessment: ['soap_templates', 'assessment_results', 'progress_tracking', 'therapeutic_goals', 'developmental_milestones', 'student_milestone_progress', 'regression_monitoring'],
  
  // System tables
  system: ['audit_logs']
};

async function checkTableExists(tableName) {
  try {
    const { data, error } = await supabase
      .from(tableName)
      .select('*')
      .limit(1);
    
    if (error) {
      return { exists: false, error: error.message };
    }
    return { exists: true, count: data?.length || 0 };
  } catch (err) {
    return { exists: false, error: err.message };
  }
}

async function checkDataCount(tableName) {
  try {
    const { count, error } = await supabase
      .from(tableName)
      .select('*', { count: 'exact', head: true });
    
    if (error) {
      return { count: 0, error: error.message };
    }
    return { count: count || 0 };
  } catch (err) {
    return { count: 0, error: err.message };
  }
}

async function verifyDatabase() {
  console.log(`${colors.blue}1. Verifying Core Tables...${colors.reset}`);
  
  let totalTables = 0;
  let existingTables = 0;
  let tablesWithData = 0;
  
  for (const [category, tables] of Object.entries(expectedTables)) {
    console.log(`\n${colors.yellow}📋 ${category.toUpperCase()} Tables:${colors.reset}`);
    
    for (const table of tables) {
      totalTables++;
      const result = await checkTableExists(table);
      
      if (result.exists) {
        existingTables++;
        const countResult = await checkDataCount(table);
        
        if (countResult.count > 0) {
          tablesWithData++;
          console.log(`${colors.green}✓ ${table} (${countResult.count} records)${colors.reset}`);
        } else {
          console.log(`${colors.cyan}✓ ${table} (empty)${colors.reset}`);
        }
      } else {
        console.log(`${colors.red}❌ ${table} - ${result.error}${colors.reset}`);
      }
    }
  }
  
  console.log(`\n${colors.bright}📊 Database Summary:${colors.reset}`);
  console.log(`${colors.green}✓ Tables Found: ${existingTables}/${totalTables}${colors.reset}`);
  console.log(`${colors.blue}ℹ Tables with Data: ${tablesWithData}/${existingTables}${colors.reset}`);
  
  if (existingTables === totalTables) {
    console.log(`${colors.green}🎉 All expected tables exist!${colors.reset}`);
  } else {
    console.log(`${colors.red}⚠ Missing ${totalTables - existingTables} tables${colors.reset}`);
  }
  
  // Check specific new features
  console.log(`\n${colors.blue}2. Verifying New Feature Data...${colors.reset}`);
  
  // Check therapy programs
  const programsResult = await checkDataCount('therapy_programs');
  if (programsResult.count >= 12) {
    console.log(`${colors.green}✓ Therapy Programs: ${programsResult.count}/12 expected${colors.reset}`);
  } else {
    console.log(`${colors.yellow}⚠ Therapy Programs: ${programsResult.count}/12 expected${colors.reset}`);
  }
  
  // Check assessment tools
  const toolsResult = await checkDataCount('assessment_tools');
  if (toolsResult.count >= 5) {
    console.log(`${colors.green}✓ Assessment Tools: ${toolsResult.count} available${colors.reset}`);
  } else {
    console.log(`${colors.yellow}⚠ Assessment Tools: ${toolsResult.count} available${colors.reset}`);
  }
  
  // Check developmental milestones
  const milestonesResult = await checkDataCount('developmental_milestones');
  if (milestonesResult.count >= 10) {
    console.log(`${colors.green}✓ Developmental Milestones: ${milestonesResult.count} defined${colors.reset}`);
  } else {
    console.log(`${colors.yellow}⚠ Developmental Milestones: ${milestonesResult.count} defined${colors.reset}`);
  }
  
  // Check SOAP templates
  const soapResult = await checkDataCount('soap_templates');
  if (soapResult.count >= 3) {
    console.log(`${colors.green}✓ SOAP Templates: ${soapResult.count} configured${colors.reset}`);
  } else {
    console.log(`${colors.yellow}⚠ SOAP Templates: ${soapResult.count} configured${colors.reset}`);
  }
  
  console.log(`\n${colors.bright}🔍 Verification Complete!${colors.reset}`);
  
  return {
    totalTables,
    existingTables,
    tablesWithData,
    success: existingTables === totalTables
  };
}

async function main() {
  try {
    const result = await verifyDatabase();
    
    if (result.success) {
      console.log(`\n${colors.green}✅ Database verification passed!${colors.reset}`);
      process.exit(0);
    } else {
      console.log(`\n${colors.red}❌ Database verification failed - missing tables${colors.reset}`);
      console.log(`${colors.yellow}📋 Recommendation: Run the combined_migrations.sql in Supabase Dashboard${colors.reset}`);
      process.exit(1);
    }
  } catch (error) {
    console.error(`${colors.red}❌ Verification failed:${colors.reset}`, error.message);
    process.exit(1);
  }
}

main();