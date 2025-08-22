import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

// Read environment variables
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.log('❌ Missing Supabase credentials in environment variables');
  console.log('Please ensure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function applySeedData() {
  try {
    console.log('🚀 Starting seed data application...\n');

    // Apply therapy programs seed data
    console.log('📊 Applying therapy programs seed data...');
    const therapyData = fs.readFileSync('database/015_therapy_programs_seed_data.sql', 'utf8');
    
    // Split into individual statements to handle large queries
    const therapyStatements = therapyData.split(';').filter(stmt => stmt.trim().length > 0);
    
    for (let i = 0; i < therapyStatements.length; i++) {
      const statement = therapyStatements[i].trim();
      if (statement) {
        const { error } = await supabase.rpc('exec', { sql: statement });
        if (error) {
          console.log(`Error in therapy statement ${i + 1}:`, error.message);
        }
      }
    }
    console.log('✅ Therapy programs seed data applied\n');

    // Apply assessment seed data
    console.log('📊 Applying assessment seed data...');
    const assessmentData = fs.readFileSync('database/017_assessment_seed_data.sql', 'utf8');
    
    const assessmentStatements = assessmentData.split(';').filter(stmt => stmt.trim().length > 0);
    
    for (let i = 0; i < assessmentStatements.length; i++) {
      const statement = assessmentStatements[i].trim();
      if (statement) {
        const { error } = await supabase.rpc('exec', { sql: statement });
        if (error) {
          console.log(`Error in assessment statement ${i + 1}:`, error.message);
        }
      }
    }
    console.log('✅ Assessment seed data applied\n');

    console.log('🎉 All seed data applied successfully!');
    
    // Verify the results
    console.log('\n🔍 Verifying seed data...');
    const { data: therapyPrograms } = await supabase.from('therapy_programs').select('count');
    const { data: assessmentTools } = await supabase.from('assessment_tools').select('count');
    const { data: milestones } = await supabase.from('developmental_milestones').select('count');
    
    console.log(`📊 Therapy Programs: ${therapyPrograms?.length || 0}`);
    console.log(`🔧 Assessment Tools: ${assessmentTools?.length || 0}`);
    console.log(`📈 Developmental Milestones: ${milestones?.length || 0}`);
    
  } catch (error) {
    console.error('❌ Error applying seed data:', error.message);
    if (error.details) {
      console.error('Details:', error.details);
    }
    if (error.hint) {
      console.error('Hint:', error.hint);
    }
    process.exit(1);
  }
}

applySeedData();