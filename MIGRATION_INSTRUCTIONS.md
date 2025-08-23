# 🚀 Database Migration Instructions

## Current Status
Your database currently has **14/32 tables** - missing the new medical foundation, therapy programs, and assessment tables from Phases 1-3.

## ⚠️ Critical: Apply Missing Migrations

### Option 1: Quick Migration (Recommended)
1. **Open Supabase Dashboard** → SQL Editor
2. **Copy the entire content** from `database/new_migrations_only.sql`
3. **Paste and click "Run"**
4. **Verify** by running: `node scripts/verify-complete-database.js`

### Option 2: Complete Migration (If Option 1 fails)
1. **Open Supabase Dashboard** → SQL Editor
2. **Copy the entire content** from `database/combined_migrations.sql`
3. **Paste and click "Run"** (this will recreate everything)
4. **Verify** by running: `node scripts/verify-complete-database.js`

## Expected Results After Migration

### New Tables Added (18 tables):
- **Medical Foundation (4)**: `medical_records`, `medical_consultants`, `clinical_documentation`, `medical_supervision_assignments`
- **Therapy Programs (7)**: `therapy_programs`, `aba_data_collection`, `speech_therapy_data`, `occupational_therapy_data`, `assessment_tools`, `intervention_protocols`, `program_enrollments`
- **Assessment System (7)**: `soap_templates`, `assessment_results`, `progress_tracking`, `therapeutic_goals`, `developmental_milestones`, `student_milestone_progress`, `regression_monitoring`

### Sample Data Included:
- **12 Therapy Programs** (ABA, Speech, OT, PT, etc.)
- **Assessment Tools** (VB-MAPP, CARS-2, PLS-5, SIPT)
- **Developmental Milestones** (Communication, Motor, Social)
- **SOAP Templates** for each therapy type
- **Sample Assessment Results** for existing students

## Verification Steps

1. **Run verification script**:
   ```bash
   node scripts/verify-complete-database.js
   ```

2. **Expected output**:
   - ✅ Tables Found: 32/32
   - ✅ Therapy Programs: 12/12 expected
   - ✅ Assessment Tools: 5+ available
   - ✅ Developmental Milestones: 12+ defined
   - ✅ SOAP Templates: 3+ configured

## If Migration Fails

### Common Issues:
1. **Permission errors**: Ensure your Supabase project has admin access
2. **RLS conflicts**: Some policies might conflict with existing data
3. **Foreign key errors**: Ensure existing data integrity

### Troubleshooting:
1. **Check Supabase Dashboard logs** for specific error messages
2. **Run migrations in smaller chunks** if needed
3. **Backup existing data** before major changes
4. **Contact support** if critical errors persist

## Next Steps After Successful Migration

1. **Frontend Integration**: Update TypeScript types and React components
2. **API Hooks**: Add new hooks for medical and therapy program features
3. **Testing**: Verify all existing functionality still works
4. **Phase 4**: Ready to proceed with QR/WhatsApp/Insurance integration

## Files Involved

- `database/new_migrations_only.sql` - Only new tables (recommended)
- `database/combined_migrations.sql` - Complete migration (backup option)
- `scripts/verify-complete-database.js` - Verification script
- `scripts/apply-missing-migrations.js` - Automated migration (if API access works)

---

**⚠️ Important**: Do not proceed to Phase 4 until all 32 tables are verified as existing and populated with sample data.