# Authentication Setup Guide

This guide will help you set up authentication for the Arkan Therapy Plans application.

## Step 1: Enable Authentication in Supabase Dashboard

1. **Go to your Supabase Dashboard**
   - Navigate to https://supabase.com
   - Select your project: `oqolbghmaxavxpoeipdf`

2. **Configure Authentication Settings**
   - Go to **Authentication** > **Settings** in the left sidebar
   - Under **General settings**:
     - Enable **Email confirmations**: Turn OFF (for development)
     - **Site URL**: `http://localhost:5176` (for development)
     - **Redirect URLs**: Add `http://localhost:5176/**` 

3. **Configure Email Templates** (Optional for now)
   - Go to **Authentication** > **Email Templates**
   - Customize welcome email, reset password, etc. (Arabic/English support)

## Step 2: Create the First Admin User

### Option A: Using Supabase Dashboard (Recommended)

1. **Go to Authentication > Users**
2. **Click "Create new user"**
3. **Fill in details**:
   - Email: `admin@arkan-center.com`
   - Password: `Admin@123456` (change this!)
   - Email Confirm: ✅ (check this)

4. **Add User Metadata**:
   ```json
   {
     "name": "مدير النظام",
     "role": "admin"
   }
   ```

### Option B: Using SQL (Alternative)

Run this in Supabase SQL Editor:

```sql
-- Insert admin user (replace with your preferred email/password)
INSERT INTO auth.users (
  id,
  instance_id,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  raw_user_meta_data,
  is_super_admin,
  role
) VALUES (
  gen_random_uuid(),
  '00000000-0000-0000-0000-000000000000',
  'admin@arkan-center.com',
  crypt('Admin@123456', gen_salt('bf')),
  NOW(),
  NOW(),
  NOW(),
  '{"name":"مدير النظام","role":"admin"}'::jsonb,
  false,
  'authenticated'
);
```

## Step 3: Test Authentication

1. **Start the development server**:
   ```bash
   npm run dev
   ```

2. **Open the app** in your browser: `http://localhost:5176`

3. **Test login**:
   - Email: `admin@arkan-center.com`
   - Password: `Admin@123456`

4. **Verify user profile**:
   - Check if the user appears in the profiles table
   - Verify role is set to "admin"
   - Test role-based permissions

## Step 4: Verify Profile Creation

The app has a trigger that automatically creates profiles when users sign up. Verify this works:

```sql
-- Check if profile was created
SELECT * FROM profiles WHERE email = 'admin@arkan-center.com';
```

Expected result:
- Profile should exist
- Role should be 'admin'
- Name should be 'مدير النظام'

## Step 5: Test Role-Based Access

Once logged in as admin, you should be able to:

✅ View all therapy plans  
✅ Create new therapy plans  
✅ Edit existing plans  
✅ Delete plans  
✅ Manage categories  
✅ View all users  

## Troubleshooting

### Issue: User can't login
- Check email is confirmed in Authentication > Users
- Verify Site URL and Redirect URLs are correct
- Check browser console for errors

### Issue: Profile not created automatically
- Verify the trigger exists: `on_auth_user_created`
- Check if the `handle_new_user()` function exists
- Manually create profile if needed

### Issue: Wrong permissions
- Check user role in profiles table
- Verify RLS policies are working
- Test with different user roles

## Next Steps

After authentication is working:

1. **Create additional test users** with different roles:
   - Manager: `manager@arkan-center.com`
   - Therapist: `therapist@arkan-center.com`
   - Receptionist: `reception@arkan-center.com`

2. **Test CRUD operations** for therapy plans

3. **Set up role-based navigation** in the UI

4. **Implement user management** features

---

**Security Note**: Change the default admin password after initial setup!