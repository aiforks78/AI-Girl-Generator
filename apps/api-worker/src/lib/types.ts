export interface AuthEnv {
  AUTH_JWT_SECRET: string;
  AUTH_JWT_ISS?: string;
  AUTH_JWT_AUD?: string;
  AUTH_SIGNUP_BONUS?: string;
  AUTH_ALLOWED_ORIGINS?: string;
  AUTH_BASE_URL?: string;
  AUTH_COOKIE_DOMAIN?: string;
  SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
  GOOGLE_CLIENT_ID: string;
  GOOGLE_CLIENT_SECRET: string;
}
