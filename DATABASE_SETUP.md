# Database Setup Guide

This guide will help you set up the database schema for the Arkan Therapy Plans application.

## Prerequisites

1. Supabase project created
2. Environment variables configured in `.env` file
3. Access to Supabase Dashboard

## Option 1: Manual Setup (Recommended)

### Step 1: Open Supabase Dashboard

1. Go to [supabase.com](https://supabase.com)
2. Sign in to your account
3. Navigate to your project: `oqolbghmaxavxpoeipdf`
4. Go to **SQL Editor** in the left sidebar

### Step 2: Run Migration Files

Execute the following SQL files in order by copying their content to the SQL Editor:

#### 1. Core Tables (`database/001_create_tables.sql`)
- Creates plan_categories, therapy_plans, plan_sessions, plan_templates, profiles tables
- Sets up indexes and triggers
- **IMPORTANT**: Run this first

#### 2. Row Level Security (`database/002_create_policies.sql`)
- Sets up security policies for all tables
- Ensures data isolation between users

#### 3. Seed Data (`database/003_insert_seed_data.sql`)
- Inserts initial categories and sample therapy plans
- Creates sample data for testing

#### 4. Student Management (`database/004_student_management_tables.sql`)
- Creates student-related tables (if needed for Phase 2)

#### 5. Student Policies (`database/005_student_management_policies.sql`)
- Sets up RLS policies for student tables

#### 6. Student Seed Data (`database/006_student_management_seed_data.sql`)
- Inserts sample student data

### Step 3: Verify Setup

After running the migrations, verify the setup by:

1. Checking that tables exist in **Database > Tables**
2. Running the connection test: `npm run test:db`
3. Starting the development server: `npm run dev`

## Option 2: Programmatic Setup

If you have the Supabase CLI installed:

```bash
# Install Supabase CLI
npm install -g supabase

# Login to Supabase
supabase login

# Link to your project
supabase link --project-ref oqolbghmaxavxpoeipdf

# Run migrations
supabase db push
```

## Environment Variables

Ensure your `.env` file contains:

```env
VITE_SUPABASE_URL=https://oqolbghmaxavxpoeipdf.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key_here
```

## Troubleshooting

### Common Issues:

1. **"Table does not exist" errors**
   - Make sure you ran `001_create_tables.sql` first
   - Check that the SQL executed without errors

2. **Permission denied errors**
   - Ensure RLS policies are set up correctly (`002_create_policies.sql`)
   - Check that your user has the correct role

3. **Connection issues**
   - Verify environment variables are correct
   - Test connection with `node test-supabase-connection.js`

### Getting Help:

If you encounter issues:
1. Check the Supabase Dashboard logs
2. Verify your project URL and keys
3. Ensure your internet connection is stable

## Next Steps

After database setup is complete:
1. Test the application: `npm run dev`
2. Create your first admin user
3. Start adding therapy plans and categories

---

**Note**: This setup is for Phase 1 of development. Additional tables and features will be added in subsequent phases.