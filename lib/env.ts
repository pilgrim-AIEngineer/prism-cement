import { z } from "zod";

// Validates required environment variables at module load time.
// Imported early in the process (e.g. prisma.config.ts or the Next.js
// instrumentation hook) so a misconfigured deploy fails loudly at startup
// rather than silently at request time.
//
// Add optional vars here with .optional() so they're documented centrally
// even when not strictly required.

const envSchema = z.object({
  // Database — Supabase pooler (transaction mode) for runtime queries
  DATABASE_URL: z.string().url("DATABASE_URL must be a valid URL"),
  // Database — Supabase direct connection for migrations (never the pooler)
  DIRECT_URL: z.string().url("DIRECT_URL must be a valid URL"),

  // Auth — HMAC secret for session tokens. Fail fast in production.
  AUTH_SECRET: z
    .string()
    .min(32, "AUTH_SECRET must be at least 32 characters")
    .refine(
      (v) => process.env.NODE_ENV !== "production" || v !== "dev-only-insecure-secret-do-not-use-in-production",
      "AUTH_SECRET must be changed from the dev default in production",
    ),

  // Supabase — storage credentials
  NEXT_PUBLIC_SUPABASE_URL: z.string().url("NEXT_PUBLIC_SUPABASE_URL must be a valid URL").optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1).optional(),

  // Storage bucket name (defaults to "requirement-files")
  STORAGE_BUCKET: z.string().min(1).optional(),

  // Feature flags
  SHOW_BID_COUNT: z.enum(["true", "false"]).optional(),

  // Seed override
  SEED_ADMIN_PHONE: z.string().optional(),

  // Next.js node env
  NODE_ENV: z.enum(["development", "test", "production"]).optional(),
});

type Env = z.infer<typeof envSchema>;

let _env: Env | null = null;

export function validateEnv(): Env {
  if (_env) return _env;
  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    const issues = result.error.issues
      .map((i) => `  • ${i.path.join(".")}: ${i.message}`)
      .join("\n");
    throw new Error(`Environment validation failed:\n${issues}`);
  }
  _env = result.data;
  return _env;
}

// Call once at startup — throws with a clear message on misconfiguration.
validateEnv();
