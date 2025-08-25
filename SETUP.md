# 🚀 Arkan Therapy Management System - Setup Guide

This guide will help you set up the Arkan Therapy Management System for development and production environments.

## 📋 Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** 18+ and npm
- **Git** for version control
- **Modern browser** (Chrome, Firefox, Safari, Edge)

## 🔧 Quick Setup (Minimum Configuration)

### 1. Clone the Repository
```bash
git clone https://github.com/your-org/arkan-therapy-system.git
cd arkan-therapy-system
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Environment Configuration
```bash
# Copy the example environment file
cp .env.example .env

# Open .env in your editor and configure the required variables
```

**Required Environment Variables (Minimum):**
- `VITE_SUPABASE_URL` - Your Supabase project URL
- `VITE_SUPABASE_ANON_KEY` - Your Supabase anonymous key

### 4. Set up Supabase Database

#### Option A: Create New Supabase Project
1. Go to [supabase.com](https://app.supabase.com)
2. Create a new project
3. Copy your project URL and anon key to `.env`
4. Run the database migrations:
   ```bash
   # Apply all migrations
   node scripts/apply-migrations.js
   ```

#### Option B: Use Existing Database
1. Get credentials from your database administrator
2. Update `.env` with your database connection details

### 5. Start Development Server
```bash
npm run dev
```

The application will be available at `http://localhost:5174`

## 🏥 Complete Setup (All Features)

### Database Setup

#### 1. Apply Database Migrations
```bash
# Apply the complete system schema
psql -h your-supabase-host -U postgres -d postgres -f database/complete_system_migrations.sql

# Or use the script
node scripts/apply-complete-migrations.js
```

#### 2. Verify Database Setup
```bash
# Check if all tables are created
node scripts/verify-database.js
```

### Authentication Setup

The system uses Supabase Auth with the following roles:
- `admin` - Full system access
- `manager` - Management operations
- `therapist_lead` - Therapy oversight
- `therapist` - Patient care
- `receptionist` - Basic operations

### Saudi Arabia Integrations

#### WhatsApp Business API Setup
1. **Create Meta Business Account**
   - Go to [business.facebook.com](https://business.facebook.com)
   - Create a Business Account
   - Set up WhatsApp Business API

2. **Get API Credentials**
   ```bash
   VITE_WHATSAPP_BUSINESS_ID="your-business-id"
   VITE_WHATSAPP_ACCESS_TOKEN="your-access-token"
   VITE_WHATSAPP_PHONE_NUMBER_ID="your-phone-number-id"
   ```

3. **Configure Webhooks**
   - Set webhook URL: `https://your-domain.com/api/whatsapp/webhook`
   - Configure verify token in `.env`

#### Insurance Providers Integration

**Bupa Arabia:**
1. Contact Bupa Arabia Developer Portal
2. Request API access for healthcare providers
3. Configure credentials:
   ```bash
   VITE_BUPA_API_ENDPOINT="https://api.bupaarabia.com/v1"
   VITE_BUPA_CLIENT_ID="your-client-id"
   VITE_BUPA_CLIENT_SECRET="your-client-secret"
   ```

**Tawuniya:**
1. Register at Tawuniya Developer Portal
2. Submit healthcare provider documentation
3. Configure API endpoints

**NPHIES Integration:**
1. Contact Ministry of Health - Digital Health Department
2. Register for NPHIES access
3. Complete compliance requirements

#### Payment Gateways

**STC Pay:**
1. Create merchant account at [stcpay.com.sa](https://stcpay.com.sa)
2. Get API credentials
3. Configure in `.env`

**MADA:**
1. Contact MADA-certified payment service provider
2. Set up merchant account
3. Configure payment endpoints

## 🔐 Security Configuration

### Healthcare Compliance (Saudi PDPL)

1. **Data Encryption Setup**
   ```bash
   # Generate encryption keys
   openssl rand -hex 32  # For ENCRYPTION_KEY
   openssl rand -hex 16  # For ENCRYPTION_IV
   ```

2. **Set Security Headers**
   - Already configured in `netlify.toml`
   - Includes HIPAA-equivalent security headers

3. **Database Security**
   - Row Level Security (RLS) is enabled
   - All medical data is encrypted at rest
   - Audit logging is implemented

### SSL/TLS Certificate
```bash
# For production deployment
VITE_SSL_ENABLED="true"
VITE_PRODUCTION_DOMAIN="app.arkantherapy.com"
```

## 📱 Mobile App Setup (Optional)

The system includes React Native components for mobile app development:

```bash
# Install React Native CLI
npm install -g @react-native-community/cli

# Set up mobile development environment
# Follow React Native setup guide for iOS/Android
```

## 🧪 Testing Configuration

### Run Tests
```bash
# Unit tests
npm run test

# Integration tests
npm run test:integration

# End-to-end tests
npm run test:e2e
```

### Database Testing
```bash
# Test database connections
npm run test:db

# Verify all tables
node scripts/verify-complete-database.js
```

## 🚀 Production Deployment

### Netlify Deployment (Recommended)

1. **Connect Repository**
   - Connect your Git repository to Netlify
   - Set build command: `npm run build:production`

2. **Environment Variables**
   - Set all production environment variables in Netlify dashboard
   - Never commit `.env` to version control

3. **Custom Domain**
   ```bash
   # Configure custom domain
   VITE_PRODUCTION_DOMAIN="app.arkantherapy.com"
   ```

### Alternative Deployment Options

**Vercel:**
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod
```

**AWS S3 + CloudFront:**
```bash
# Build for production
npm run build:production

# Upload to S3 bucket
aws s3 sync dist/ s3://your-bucket-name
```

## 🔧 Development Tools

### Available Scripts
```bash
# Development
npm run dev              # Start development server
npm run build           # Build for production
npm run preview         # Preview production build
npm run lint            # Run ESLint
npm run type-check      # TypeScript checking

# Database
npm run db:verify       # Verify database setup
npm run db:migrate      # Apply migrations
npm run db:seed         # Seed test data

# Testing
npm run test            # Run tests
npm run test:coverage   # Generate coverage report
```

### Code Quality Tools
- **ESLint** - Code linting
- **TypeScript** - Type checking
- **Prettier** - Code formatting (configured in VSCode)

## 📊 Monitoring and Analytics

### Error Monitoring (Sentry)
```bash
VITE_SENTRY_DSN="https://your-sentry-dsn@sentry.io/project-id"
VITE_SENTRY_ENVIRONMENT="production"
```

### Analytics (Google Analytics)
```bash
VITE_GOOGLE_ANALYTICS_ID="G-XXXXXXXXXX"
```

## 🆘 Troubleshooting

### Common Issues

**1. Supabase Connection Errors**
```bash
# Check your environment variables
echo $VITE_SUPABASE_URL
echo $VITE_SUPABASE_ANON_KEY

# Verify network connectivity
curl -I https://your-project-ref.supabase.co
```

**2. Database Migration Issues**
```bash
# Reset database (development only)
node scripts/reset-database.js

# Apply migrations step by step
node scripts/apply-migrations.js --step-by-step
```

**3. Build Issues**
```bash
# Clear build cache
rm -rf dist/ node_modules/.vite

# Reinstall dependencies
npm ci
npm run build
```

**4. Arabic Font Issues**
- Ensure Google Fonts are loading correctly
- Check internet connectivity for CDN resources
- Verify RTL CSS is properly configured

### Getting Help

1. **Check the logs** - Look at browser console and network tab
2. **Verify environment** - Ensure all required variables are set
3. **Database status** - Check Supabase dashboard for issues
4. **Community support** - Create an issue in the GitHub repository

## 📝 Additional Resources

- [Supabase Documentation](https://supabase.com/docs)
- [WhatsApp Business API](https://developers.facebook.com/docs/whatsapp)
- [Saudi PDPL Compliance Guide](https://sdaia.gov.sa/en/PDPL/)
- [NPHIES Documentation](https://nphies.sa/)
- [React + TypeScript Best Practices](https://react-typescript-cheatsheet.netlify.app/)

## 🏥 Healthcare-Specific Setup

### ICD-10 Codes
The system supports ICD-10 medical coding. Codes are stored as arrays in the medical records.

### SOAP Notes
Clinical documentation follows SOAP (Subjective, Objective, Assessment, Plan) format for medical compliance.

### Row Level Security
All patient data is protected by Supabase RLS policies ensuring HIPAA-equivalent privacy protection.

---

**Support:** For technical support, please create an issue in the GitHub repository or contact the development team.

**Last Updated:** January 2025  
**Version:** 1.2.0