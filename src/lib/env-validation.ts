import { z } from 'zod'

// Environment validation schema
const envSchema = z.object({
  // Required environment variables
  VITE_SUPABASE_URL: z.string().url('Invalid Supabase URL'),
  VITE_SUPABASE_ANON_KEY: z.string().min(1, 'Supabase anonymous key is required'),
  
  // Optional application configuration
  VITE_APP_NAME: z.string().default('Arkan Growth Center'),
  VITE_APP_VERSION: z.string().default('1.0.0'),
  VITE_ENVIRONMENT: z.enum(['development', 'staging', 'production']).default('development'),
  VITE_APP_DOMAIN: z.string().default('localhost:5174'),
  
  // Optional WhatsApp configuration
  VITE_WHATSAPP_API_ENDPOINT: z.string().url().optional(),
  VITE_WHATSAPP_BUSINESS_ID: z.string().optional(),
  VITE_WHATSAPP_ACCESS_TOKEN: z.string().optional(),
  VITE_WHATSAPP_PHONE_NUMBER_ID: z.string().optional(),
  VITE_WHATSAPP_WEBHOOK_VERIFY_TOKEN: z.string().optional(),
  
  // Optional insurance provider APIs
  VITE_BUPA_API_ENDPOINT: z.string().url().optional(),
  VITE_BUPA_CLIENT_ID: z.string().optional(),
  VITE_BUPA_CLIENT_SECRET: z.string().optional(),
  
  VITE_TAWUNIYA_API_ENDPOINT: z.string().url().optional(),
  VITE_TAWUNIYA_CLIENT_ID: z.string().optional(),
  VITE_TAWUNIYA_CLIENT_SECRET: z.string().optional(),
  
  VITE_MEDGULF_API_ENDPOINT: z.string().url().optional(),
  VITE_MEDGULF_CLIENT_ID: z.string().optional(),
  VITE_MEDGULF_CLIENT_SECRET: z.string().optional(),
  
  VITE_ALRAJHI_API_ENDPOINT: z.string().url().optional(),
  VITE_ALRAJHI_CLIENT_ID: z.string().optional(),
  VITE_ALRAJHI_CLIENT_SECRET: z.string().optional(),
  
  VITE_NPHIES_API_ENDPOINT: z.string().url().optional(),
  VITE_NPHIES_CLIENT_ID: z.string().optional(),
  VITE_NPHIES_CLIENT_SECRET: z.string().optional(),
  
  // Optional payment gateway configuration
  VITE_STC_PAY_API_ENDPOINT: z.string().url().optional(),
  VITE_STC_PAY_MERCHANT_ID: z.string().optional(),
  VITE_STC_PAY_API_KEY: z.string().optional(),
  
  VITE_MADA_API_ENDPOINT: z.string().url().optional(),
  VITE_MADA_MERCHANT_ID: z.string().optional(),
  VITE_MADA_API_KEY: z.string().optional(),
  
  // Optional email service configuration
  VITE_EMAIL_SERVICE_PROVIDER: z.string().optional(),
  VITE_SENDGRID_API_KEY: z.string().optional(),
  VITE_FROM_EMAIL: z.string().email().optional(),
  VITE_FROM_NAME: z.string().optional(),
  
  // Optional file storage configuration
  VITE_STORAGE_PROVIDER: z.string().default('supabase'),
  VITE_AWS_S3_BUCKET: z.string().optional(),
  VITE_AWS_S3_REGION: z.string().optional(),
  VITE_AWS_ACCESS_KEY_ID: z.string().optional(),
  VITE_AWS_SECRET_ACCESS_KEY: z.string().optional(),
  
  // Optional analytics and monitoring
  VITE_GOOGLE_ANALYTICS_ID: z.string().optional(),
  VITE_SENTRY_DSN: z.string().url().optional(),
  VITE_SENTRY_ENVIRONMENT: z.string().optional(),
  
  // Optional AI services
  VITE_OPENAI_API_KEY: z.string().optional(),
  VITE_OPENAI_MODEL: z.string().default('gpt-4'),
  VITE_AZURE_COGNITIVE_KEY: z.string().optional(),
  VITE_AZURE_COGNITIVE_ENDPOINT: z.string().url().optional(),
  
  // Optional external integrations
  VITE_GOOGLE_CALENDAR_CLIENT_ID: z.string().optional(),
  VITE_GOOGLE_CALENDAR_API_KEY: z.string().optional(),
  VITE_TEAMS_CLIENT_ID: z.string().optional(),
  VITE_TEAMS_CLIENT_SECRET: z.string().optional(),
  VITE_ZOOM_CLIENT_ID: z.string().optional(),
  VITE_ZOOM_CLIENT_SECRET: z.string().optional(),
  
  // Optional development settings
  VITE_DEBUG_MODE: z.string().transform(val => val === 'true').default('false'),
  VITE_VERBOSE_LOGGING: z.string().transform(val => val === 'true').default('false'),
  VITE_MOCK_EXTERNAL_APIS: z.string().transform(val => val === 'true').default('true'),
  
  // Optional production settings
  VITE_CDN_URL: z.string().url().optional(),
  VITE_PRODUCTION_DOMAIN: z.string().optional(),
  VITE_SSL_ENABLED: z.string().transform(val => val === 'true').default('false'),
})

export type Env = z.infer<typeof envSchema>

// Validate and parse environment variables
export function validateEnv(): Env {
  try {
    const env = envSchema.parse(import.meta.env)
    
    // Log successful validation in development
    if (env.VITE_DEBUG_MODE) {
      console.log('✅ Environment variables validated successfully')
      console.log(`📱 App: ${env.VITE_APP_NAME} v${env.VITE_APP_VERSION}`)
      console.log(`🌍 Environment: ${env.VITE_ENVIRONMENT}`)
      console.log(`🔗 Supabase URL: ${env.VITE_SUPABASE_URL}`)
    }
    
    return env
  } catch (error) {
    console.error('❌ Environment variable validation failed:')
    
    if (error instanceof z.ZodError) {
      error.errors.forEach((err) => {
        console.error(`  - ${err.path.join('.')}: ${err.message}`)
      })
      
      // Provide helpful setup instructions
      console.error('\n🔧 Setup Instructions:')
      console.error('  1. Copy .env.example to .env')
      console.error('  2. Set up a Supabase project at https://app.supabase.com')
      console.error('  3. Fill in VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env file')
      console.error('  4. Restart the development server')
    }
    
    throw new Error('Environment validation failed. Please check your .env configuration.')
  }
}

// Validated environment variables - available throughout the app
export const env = validateEnv()

// Utility functions for feature availability checks
export const features = {
  // Core features (always available)
  isSupabaseConfigured: () => Boolean(env.VITE_SUPABASE_URL && env.VITE_SUPABASE_ANON_KEY),
  
  // Optional integrations
  isWhatsAppEnabled: () => Boolean(
    env.VITE_WHATSAPP_API_ENDPOINT && 
    env.VITE_WHATSAPP_ACCESS_TOKEN &&
    env.VITE_WHATSAPP_PHONE_NUMBER_ID
  ),
  
  isInsuranceIntegrationEnabled: () => Boolean(
    env.VITE_BUPA_API_ENDPOINT || 
    env.VITE_TAWUNIYA_API_ENDPOINT || 
    env.VITE_MEDGULF_API_ENDPOINT ||
    env.VITE_ALRAJHI_API_ENDPOINT ||
    env.VITE_NPHIES_API_ENDPOINT
  ),
  
  isPaymentGatewayEnabled: () => Boolean(
    env.VITE_STC_PAY_API_ENDPOINT || 
    env.VITE_MADA_API_ENDPOINT
  ),
  
  isEmailServiceEnabled: () => Boolean(
    env.VITE_SENDGRID_API_KEY && env.VITE_FROM_EMAIL
  ),
  
  isAIServicesEnabled: () => Boolean(
    env.VITE_OPENAI_API_KEY || env.VITE_AZURE_COGNITIVE_KEY
  ),
  
  isAnalyticsEnabled: () => Boolean(env.VITE_GOOGLE_ANALYTICS_ID),
  
  isMonitoringEnabled: () => Boolean(env.VITE_SENTRY_DSN),
  
  isExternalStorageEnabled: () => Boolean(
    env.VITE_AWS_S3_BUCKET && env.VITE_AWS_ACCESS_KEY_ID
  ),
  
  // Development features
  isDebugMode: () => env.VITE_DEBUG_MODE,
  isVerboseLogging: () => env.VITE_VERBOSE_LOGGING,
  shouldMockExternalAPIs: () => env.VITE_MOCK_EXTERNAL_APIS,
  
  // Production features
  isProduction: () => env.VITE_ENVIRONMENT === 'production',
  isSSLEnabled: () => env.VITE_SSL_ENABLED,
}

// Configuration objects for easy access
export const config = {
  app: {
    name: env.VITE_APP_NAME,
    version: env.VITE_APP_VERSION,
    environment: env.VITE_ENVIRONMENT,
    domain: env.VITE_APP_DOMAIN,
  },
  
  supabase: {
    url: env.VITE_SUPABASE_URL,
    anonKey: env.VITE_SUPABASE_ANON_KEY,
  },
  
  whatsapp: {
    apiEndpoint: env.VITE_WHATSAPP_API_ENDPOINT,
    businessId: env.VITE_WHATSAPP_BUSINESS_ID,
    accessToken: env.VITE_WHATSAPP_ACCESS_TOKEN,
    phoneNumberId: env.VITE_WHATSAPP_PHONE_NUMBER_ID,
    webhookVerifyToken: env.VITE_WHATSAPP_WEBHOOK_VERIFY_TOKEN,
  },
  
  insurance: {
    bupa: {
      apiEndpoint: env.VITE_BUPA_API_ENDPOINT,
      clientId: env.VITE_BUPA_CLIENT_ID,
      clientSecret: env.VITE_BUPA_CLIENT_SECRET,
    },
    tawuniya: {
      apiEndpoint: env.VITE_TAWUNIYA_API_ENDPOINT,
      clientId: env.VITE_TAWUNIYA_CLIENT_ID,
      clientSecret: env.VITE_TAWUNIYA_CLIENT_SECRET,
    },
    medgulf: {
      apiEndpoint: env.VITE_MEDGULF_API_ENDPOINT,
      clientId: env.VITE_MEDGULF_CLIENT_ID,
      clientSecret: env.VITE_MEDGULF_CLIENT_SECRET,
    },
    alrajhi: {
      apiEndpoint: env.VITE_ALRAJHI_API_ENDPOINT,
      clientId: env.VITE_ALRAJHI_CLIENT_ID,
      clientSecret: env.VITE_ALRAJHI_CLIENT_SECRET,
    },
    nphies: {
      apiEndpoint: env.VITE_NPHIES_API_ENDPOINT,
      clientId: env.VITE_NPHIES_CLIENT_ID,
      clientSecret: env.VITE_NPHIES_CLIENT_SECRET,
    },
  },
  
  payments: {
    stcPay: {
      apiEndpoint: env.VITE_STC_PAY_API_ENDPOINT,
      merchantId: env.VITE_STC_PAY_MERCHANT_ID,
      apiKey: env.VITE_STC_PAY_API_KEY,
    },
    mada: {
      apiEndpoint: env.VITE_MADA_API_ENDPOINT,
      merchantId: env.VITE_MADA_MERCHANT_ID,
      apiKey: env.VITE_MADA_API_KEY,
    },
  },
  
  email: {
    provider: env.VITE_EMAIL_SERVICE_PROVIDER,
    sendgridApiKey: env.VITE_SENDGRID_API_KEY,
    fromEmail: env.VITE_FROM_EMAIL,
    fromName: env.VITE_FROM_NAME,
  },
  
  storage: {
    provider: env.VITE_STORAGE_PROVIDER,
    aws: {
      bucket: env.VITE_AWS_S3_BUCKET,
      region: env.VITE_AWS_S3_REGION,
      accessKeyId: env.VITE_AWS_ACCESS_KEY_ID,
      secretAccessKey: env.VITE_AWS_SECRET_ACCESS_KEY,
    },
  },
  
  ai: {
    openai: {
      apiKey: env.VITE_OPENAI_API_KEY,
      model: env.VITE_OPENAI_MODEL,
    },
    azure: {
      key: env.VITE_AZURE_COGNITIVE_KEY,
      endpoint: env.VITE_AZURE_COGNITIVE_ENDPOINT,
    },
  },
  
  analytics: {
    googleAnalyticsId: env.VITE_GOOGLE_ANALYTICS_ID,
  },
  
  monitoring: {
    sentryDsn: env.VITE_SENTRY_DSN,
    sentryEnvironment: env.VITE_SENTRY_ENVIRONMENT,
  },
  
  development: {
    debugMode: env.VITE_DEBUG_MODE,
    verboseLogging: env.VITE_VERBOSE_LOGGING,
    mockExternalAPIs: env.VITE_MOCK_EXTERNAL_APIS,
  },
  
  production: {
    cdnUrl: env.VITE_CDN_URL,
    domain: env.VITE_PRODUCTION_DOMAIN,
    sslEnabled: env.VITE_SSL_ENABLED,
  },
} as const

// Feature flags based on configuration
export const featureFlags = {
  WHATSAPP_INTEGRATION: features.isWhatsAppEnabled(),
  INSURANCE_INTEGRATION: features.isInsuranceIntegrationEnabled(),
  PAYMENT_GATEWAY: features.isPaymentGatewayEnabled(),
  EMAIL_SERVICE: features.isEmailServiceEnabled(),
  AI_SERVICES: features.isAIServicesEnabled(),
  ANALYTICS: features.isAnalyticsEnabled(),
  MONITORING: features.isMonitoringEnabled(),
  EXTERNAL_STORAGE: features.isExternalStorageEnabled(),
  DEBUG_MODE: features.isDebugMode(),
  VERBOSE_LOGGING: features.isVerboseLogging(),
  MOCK_EXTERNAL_APIS: features.shouldMockExternalAPIs(),
} as const

// Runtime configuration checks
export function validateRuntimeConfiguration() {
  const checks = []
  
  // Required configurations
  if (!features.isSupabaseConfigured()) {
    checks.push({
      type: 'error' as const,
      message: 'Supabase configuration is required but missing',
      fix: 'Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env file'
    })
  }
  
  // Optional feature warnings
  if (!features.isWhatsAppEnabled()) {
    checks.push({
      type: 'warning' as const,
      message: 'WhatsApp integration not configured - parent communication features disabled',
      fix: 'Configure WhatsApp Business API credentials to enable messaging'
    })
  }
  
  if (!features.isPaymentGatewayEnabled()) {
    checks.push({
      type: 'warning' as const,
      message: 'Payment gateways not configured - online payments disabled',
      fix: 'Configure STC Pay or MADA API credentials to enable payments'
    })
  }
  
  if (features.isProduction() && !features.isMonitoringEnabled()) {
    checks.push({
      type: 'warning' as const,
      message: 'Monitoring not configured for production environment',
      fix: 'Configure Sentry DSN for error monitoring in production'
    })
  }
  
  return checks
}

// Helper function to log configuration status
export function logConfigurationStatus() {
  if (!env.VITE_DEBUG_MODE) return
  
  console.group('🔧 Application Configuration Status')
  
  const checks = validateRuntimeConfiguration()
  
  // Log errors
  const errors = checks.filter(check => check.type === 'error')
  if (errors.length > 0) {
    console.group('❌ Configuration Errors')
    errors.forEach(error => {
      console.error(`• ${error.message}`)
      console.error(`  Fix: ${error.fix}`)
    })
    console.groupEnd()
  }
  
  // Log warnings
  const warnings = checks.filter(check => check.type === 'warning')
  if (warnings.length > 0) {
    console.group('⚠️ Configuration Warnings')
    warnings.forEach(warning => {
      console.warn(`• ${warning.message}`)
      console.warn(`  Fix: ${warning.fix}`)
    })
    console.groupEnd()
  }
  
  // Log enabled features
  const enabledFeatures = Object.entries(featureFlags)
    .filter(([_, enabled]) => enabled)
    .map(([feature, _]) => feature.replace(/_/g, ' ').toLowerCase())
  
  if (enabledFeatures.length > 0) {
    console.group('✅ Enabled Features')
    enabledFeatures.forEach(feature => console.log(`• ${feature}`))
    console.groupEnd()
  }
  
  console.groupEnd()
}