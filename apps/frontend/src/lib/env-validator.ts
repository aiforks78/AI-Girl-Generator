/**
 * 🎀 Girl Generator - environment variable validation toolkit
 *
 * Features:
 * - Validate required environment variables
 * - Provide type-safe access helpers
 * - Perform validation during application startup
 *
 * ⚠️ Server-side only
 */

import 'server-only';

// Required environment variables
interface RequiredEnvVars {
  NEXT_PUBLIC_SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
  DATABASE_URL: string;
  AUTH_JWT_SECRET: string;
  GOOGLE_CLIENT_ID: string;
  GOOGLE_CLIENT_SECRET: string;
  REPLICATE_API_TOKEN: string;
  REPLICATE_FLUX_SCHNELL_VERSION: string;
}

// Optional environment variables
interface OptionalEnvVars {
  REPLICATE_WEBHOOK_SECRET?: string;
  SLACK_WEBHOOK_URL?: string;
  SENTRY_DSN?: string;
  AUTH_ALLOWED_ORIGINS?: string;
  AUTH_BASE_URL?: string;
  AUTH_COOKIE_DOMAIN?: string;
  NODE_ENV?: string;
}

// Thrown when validation fails
export class EnvValidationError extends Error {
  constructor(message: string, public missingVars: string[]) {
    super(message);
    this.name = 'EnvValidationError';
  }
}

// Validation result structure
interface ValidationResult {
  success: boolean;
  missingVars: string[];
  warnings: string[];
}

/**
 * Validate a single environment variable
 */
function validateEnvVar(key: string, value: string | undefined, required: boolean = true): {
  valid: boolean;
  warning?: string;
} {
  if (!value || value.trim() === '') {
    return { valid: !required };
  }
  
  // Special validation rules
  switch (key) {
    case 'NEXT_PUBLIC_SUPABASE_URL':
      if (!value.startsWith('https://') || !value.includes('.supabase.co')) {
        return { 
          valid: false, 
          warning: 'NEXT_PUBLIC_SUPABASE_URL should be a valid Supabase URL' 
        };
      }
      break;
      
    case 'DATABASE_URL':
      if (!value.startsWith('postgresql://')) {
        return { 
          valid: false, 
          warning: 'DATABASE_URL should be a valid PostgreSQL connection string' 
        };
      }
      break;
      
    case 'GOOGLE_CLIENT_ID':
      if (!value.endsWith('.googleusercontent.com')) {
        return { 
          valid: false, 
          warning: 'GOOGLE_CLIENT_ID should be a valid Google OAuth client ID' 
        };
      }
      break;
  }
  
  return { valid: true };
}

/**
 * Validate all required environment variables
 */
export function validateEnvironment(): ValidationResult {
  const missingVars: string[] = [];
  const warnings: string[] = [];
  
  // List of required environment variables
  const requiredVars: (keyof RequiredEnvVars)[] = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'SUPABASE_SERVICE_ROLE_KEY',
    'DATABASE_URL',
    'GOOGLE_CLIENT_ID',
    'GOOGLE_CLIENT_SECRET',
    'REPLICATE_API_TOKEN',
    'REPLICATE_FLUX_SCHNELL_VERSION'
  ];
  
  // Validate required variables
  for (const key of requiredVars) {
    const value = process.env[key];
    const validation = validateEnvVar(key, value, true);
    
    if (!value || value.trim() === '') {
      missingVars.push(key);
    } else if (!validation.valid) {
      warnings.push(`${key}: ${validation.warning}`);
    }
  }
  
  // Validate optional variables when provided
  const optionalVars: (keyof OptionalEnvVars)[] = [
    'REPLICATE_WEBHOOK_SECRET',
    'SLACK_WEBHOOK_URL',
    'SENTRY_DSN',
    'AUTH_ALLOWED_ORIGINS',
    'AUTH_BASE_URL',
    'AUTH_COOKIE_DOMAIN'
  ];
  
  for (const key of optionalVars) {
    const value = process.env[key];
    if (value) {
      const validation = validateEnvVar(key, value, false);
      if (!validation.valid && validation.warning) {
        warnings.push(`${key}: ${validation.warning}`);
      }
    }
  }
  
  return {
    success: missingVars.length === 0,
    missingVars,
    warnings
  };
}

/**
 * Retrieve validated environment values
 */
export function getValidatedEnv(skipValidation = false): RequiredEnvVars & OptionalEnvVars {
  if (!skipValidation) {
    const validation = validateEnvironment();

    if (!validation.success) {
      throw new EnvValidationError(
        `Missing required environment variables: ${validation.missingVars.join(', ')}`,
        validation.missingVars
      );
    }

    // Emit warnings when applicable
    if (validation.warnings.length > 0) {
      console.warn('Environment variable warnings:');
      validation.warnings.forEach(warning => console.warn(`  - ${warning}`));
    }
  }
  
  return {
    // Required variables
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL!,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY!,
    DATABASE_URL: process.env.DATABASE_URL!,
    AUTH_JWT_SECRET: process.env.AUTH_JWT_SECRET!,
    GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID!,
    GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET!,
    REPLICATE_API_TOKEN: process.env.REPLICATE_API_TOKEN!,
    REPLICATE_FLUX_SCHNELL_VERSION: process.env.REPLICATE_FLUX_SCHNELL_VERSION!,
    
    // Optional variables
    REPLICATE_WEBHOOK_SECRET: process.env.REPLICATE_WEBHOOK_SECRET,
    SLACK_WEBHOOK_URL: process.env.SLACK_WEBHOOK_URL,
    SENTRY_DSN: process.env.SENTRY_DSN,
    AUTH_ALLOWED_ORIGINS: process.env.AUTH_ALLOWED_ORIGINS,
    AUTH_BASE_URL: process.env.AUTH_BASE_URL,
    AUTH_COOKIE_DOMAIN: process.env.AUTH_COOKIE_DOMAIN,
    NODE_ENV: process.env.NODE_ENV
  };
}

/**
 * Safe environment accessor
 */
export class SafeEnv {
  private static instance: SafeEnv;
  private env: RequiredEnvVars & OptionalEnvVars;
  
  private constructor(skipValidation = false) {
    if (skipValidation) {
      // Provide default values during build/development
      this.env = {
        NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co',
        SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder',
        DATABASE_URL: process.env.DATABASE_URL || 'postgresql://placeholder',
        AUTH_JWT_SECRET: process.env.AUTH_JWT_SECRET || 'placeholder',
        GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID || 'placeholder.googleusercontent.com',
        GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET || 'placeholder',
        REPLICATE_API_TOKEN: process.env.REPLICATE_API_TOKEN || 'placeholder',
        REPLICATE_FLUX_SCHNELL_VERSION: process.env.REPLICATE_FLUX_SCHNELL_VERSION || 'placeholder',
        REPLICATE_WEBHOOK_SECRET: process.env.REPLICATE_WEBHOOK_SECRET,
        SLACK_WEBHOOK_URL: process.env.SLACK_WEBHOOK_URL,
        SENTRY_DSN: process.env.SENTRY_DSN,
        AUTH_ALLOWED_ORIGINS: process.env.AUTH_ALLOWED_ORIGINS,
        AUTH_BASE_URL: process.env.AUTH_BASE_URL,
        AUTH_COOKIE_DOMAIN: process.env.AUTH_COOKIE_DOMAIN,
        NODE_ENV: process.env.NODE_ENV
      };
    } else {
      this.env = getValidatedEnv(skipValidation);
    }
  }
  
  public static getInstance(): SafeEnv {
    if (!SafeEnv.instance) {
      // Skip strict validation when:
      // - SKIP_ENV_VALIDATION=true is explicitly set
      // - Running in development (NODE_ENV=development)
      // - Running in preview (VERCEL_ENV=preview)
      // - Executing the production build phase (NEXT_PHASE=phase-production-build)
      // - Running in CI (CI=true)
      const shouldSkip = process.env.SKIP_ENV_VALIDATION === 'true'
        || process.env.NODE_ENV === 'development'
        || process.env.VERCEL_ENV === 'preview'
        || process.env.NEXT_PHASE === 'phase-production-build'
        || process.env.CI === 'true';
      SafeEnv.instance = new SafeEnv(shouldSkip);
    }
    return SafeEnv.instance;
  }
  
  // Supabase configuration
  get supabaseUrl(): string {
    return this.env.NEXT_PUBLIC_SUPABASE_URL;
  }
  
  get supabaseServiceRoleKey(): string {
    return this.env.SUPABASE_SERVICE_ROLE_KEY;
  }
  
  get databaseUrl(): string {
    return this.env.DATABASE_URL;
  }
  
  // Auth configuration
  get authJwtSecret(): string {
    return this.env.AUTH_JWT_SECRET;
  }

  get authAllowedOrigins(): string | undefined {
    return this.env.AUTH_ALLOWED_ORIGINS;
  }

  get authBaseUrl(): string | undefined {
    return this.env.AUTH_BASE_URL;
  }

  get authCookieDomain(): string | undefined {
    return this.env.AUTH_COOKIE_DOMAIN;
  }
  
  // Google OAuth configuration
  get googleClientId(): string {
    return this.env.GOOGLE_CLIENT_ID;
  }
  
  get googleClientSecret(): string {
    return this.env.GOOGLE_CLIENT_SECRET;
  }
  
  // Replicate configuration
  get replicateApiToken(): string {
    return this.env.REPLICATE_API_TOKEN;
  }

  get replicateWebhookSecret(): string | undefined {
    return this.env.REPLICATE_WEBHOOK_SECRET;
  }

  get replicateFluxVersion(): string {
    return this.env.REPLICATE_FLUX_SCHNELL_VERSION;
  }
  
  // Monitoring configuration
  get slackWebhookUrl(): string | undefined {
    return this.env.SLACK_WEBHOOK_URL;
  }
  
  get sentryDsn(): string | undefined {
    return this.env.SENTRY_DSN;
  }
  
  // Environment flags
  get isDevelopment(): boolean {
    return this.env.NODE_ENV === 'development';
  }
  
  get isProduction(): boolean {
    return this.env.NODE_ENV === 'production';
  }
}

/**
 * Global environment accessor instance
 */
export const env = SafeEnv.getInstance();

/**
 * Validate environment variables during app startup
 */
export function validateOnStartup(): void {
  try {
    const validation = validateEnvironment();
    
    if (!validation.success) {
      console.error('❌ Environment validation failed!');
      console.error('Missing required environment variables:');
      validation.missingVars.forEach(varName => {
        console.error(`  - ${varName}`);
      });
      
      console.error('\nPlease check your .env file and ensure all required variables are set.');
      process.exit(1);
    }
    
    if (validation.warnings.length > 0) {
      console.warn('⚠️  Environment validation warnings:');
      validation.warnings.forEach(warning => {
        console.warn(`  - ${warning}`);
      });
    }
    
    console.log('✅ Environment validation passed');
    
  } catch (error) {
    console.error('❌ Environment validation error:', error);
    process.exit(1);
  }
}
