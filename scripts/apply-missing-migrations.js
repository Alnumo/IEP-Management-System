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
🚀 Applying Missing Database Migrations${colors.reset}
${colors.reset}
`);

const supabaseUrl = envVars.VITE_SUPABASE_URL;
const supabaseKey = envVars.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.log(`${colors.red}❌ Missing Supabase credentials in .env file${colors.reset}`);
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkIfNeedsMigrations() {
  try {
    // Check if medical_records table exists
    const { data, error } = await supabase
      .from('medical_records')
      .select('*')
      .limit(1);
    
    if (error && error.message.includes('does not exist')) {
      return true; // Needs migrations
    }
    return false; // Already has new tables
  } catch (err) {
    return true; // Assume needs migrations
  }
}

async function applyMigrations() {
  try {
    console.log(`${colors.blue}1. Checking if migrations are needed...${colors.reset}`);
    
    const needsMigrations = await checkIfNeedsMigrations();
    
    if (!needsMigrations) {
      console.log(`${colors.green}✓ Database already has new tables - no migrations needed${colors.reset}`);
      return;
    }
    
    console.log(`${colors.yellow}📋 New tables needed - reading migration file...${colors.reset}`);
    
    // Read the new migrations file
    const migrationSql = readFileSync(join(__dirname, '..', 'database', 'new_migrations_only.sql'), 'utf8');
    
    console.log(`${colors.blue}2. Applying migrations to database...${colors.reset}`);
    
    // Split SQL into individual statements and execute
    const statements = migrationSql
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));
    
    let successCount = 0;
    let errorCount = 0;
    
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      
      if (statement.includes('SELECT ') && statement.includes(' as status')) {
        // Skip SELECT status statements
        continue;
      }
      
      try {
        const { error } = await supabase.rpc('exec_sql', { sql: statement });
        if (error) {
          console.log(`${colors.yellow}⚠ Statement ${i + 1}: ${error.message}${colors.reset}`);
          errorCount++;
        } else {
          successCount++;
        }
      } catch (err) {
        console.log(`${colors.yellow}⚠ Statement ${i + 1}: ${err.message}${colors.reset}`);
        errorCount++;
      }
    }
    
    console.log(`\n${colors.blue}3. Migration Results:${colors.reset}`);
    console.log(`${colors.green}✓ Successful statements: ${successCount}${colors.reset}`);
    console.log(`${colors.yellow}⚠ Warnings/Skipped: ${errorCount}${colors.reset}`);
    
    // Verify the new tables exist
    console.log(`\n${colors.blue}4. Verifying new tables...${colors.reset}`);
    
    const newTables = ['medical_records', 'therapy_programs', 'assessment_tools', 'soap_templates'];
    let verifiedCount = 0;
    
    for (const table of newTables) {
      try {
        const { data, error } = await supabase
          .from(table)
          .select('*')
          .limit(1);
        
        if (!error) {
          console.log(`${colors.green}✓ ${table} - Available${colors.reset}`);
          verifiedCount++;
        } else {
          console.log(`${colors.red}❌ ${table} - ${error.message}${colors.reset}`);
        }
      } catch (err) {
        console.log(`${colors.red}❌ ${table} - ${err.message}${colors.reset}`);
      }
    }
    
    if (verifiedCount === newTables.length) {
      console.log(`\n${colors.green}🎉 All migrations applied successfully!${colors.reset}`);
      console.log(`${colors.blue}📋 You can now run: node scripts/verify-complete-database.js${colors.reset}`);
    } else {
      console.log(`\n${colors.yellow}⚠ Some migrations may not have applied correctly${colors.reset}`);
      console.log(`${colors.blue}📋 Please check Supabase Dashboard > SQL Editor and run the migrations manually${colors.reset}`);
    }
    
  } catch (error) {
    console.error(`${colors.red}❌ Migration failed:${colors.reset}`, error.message);
    console.log(`\n${colors.blue}📋 Manual Migration Instructions:${colors.reset}`);
    console.log(`1. Go to your Supabase Dashboard > SQL Editor`);
    console.log(`2. Copy the content from database/new_migrations_only.sql`);
    console.log(`3. Paste and run the SQL`);
    console.log(`4. Verify with: node scripts/verify-complete-database.js`);
  }
}

async function main() {
  await applyMigrations();
}

main();