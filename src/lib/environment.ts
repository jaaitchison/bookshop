import { z } from "zod";

const emptyToUndefined = (value: unknown) => value === "" ? undefined : value;
const optionalSecret = z.preprocess(emptyToUndefined, z.string().min(8).optional());

const serverEnvironmentSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  DATABASE_URL: z.string().url().refine(
    (value) => value.startsWith("postgresql://") || value.startsWith("postgres://"),
    "DATABASE_URL must use PostgreSQL.",
  ),
  APP_ORIGIN: z.preprocess(emptyToUndefined, z.string().url().optional()),
  ALLOWED_CORS_ORIGINS: z.preprocess(emptyToUndefined, z.string().optional()),
  STRIPE_SECRET_KEY: optionalSecret,
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: optionalSecret,
  STRIPE_WEBHOOK_SECRET: optionalSecret,
  RESEND_API_KEY: optionalSecret,
  ORDER_CONFIRMATION_FROM_EMAIL: z.preprocess(emptyToUndefined, z.string().email().optional()),
  STORAGE_DRIVER: z.enum(["local", "s3"]).default("local"),
  S3_ENDPOINT: z.preprocess(emptyToUndefined, z.string().url().optional()),
  S3_REGION: z.preprocess(emptyToUndefined, z.string().min(1).optional()),
  S3_PUBLIC_BUCKET: z.preprocess(emptyToUndefined, z.string().min(3).optional()),
  S3_PRIVATE_BUCKET: z.preprocess(emptyToUndefined, z.string().min(3).optional()),
  S3_ACCESS_KEY_ID: optionalSecret,
  S3_SECRET_ACCESS_KEY: optionalSecret,
  S3_PUBLIC_BASE_URL: z.preprocess(emptyToUndefined, z.string().url().optional()),
  LEGAL_BUSINESS_NAME: z.preprocess(emptyToUndefined, z.string().min(2).optional()),
  LEGAL_CONTACT_EMAIL: z.preprocess(emptyToUndefined, z.string().email().optional()),
  LEGAL_BUSINESS_ADDRESS: z.preprocess(emptyToUndefined, z.string().min(10).optional()),
});

export class EnvironmentValidationError extends Error {
  constructor(readonly issues: string[]) {
    super(`Invalid server environment: ${issues.join("; ")}`);
    this.name = "EnvironmentValidationError";
  }
}

export function validateServerEnvironment(
  source: NodeJS.ProcessEnv = process.env,
  options: { requireProductionOrigin?: boolean; requirePayments?: boolean; requireLegalIdentity?: boolean } = {},
) {
  const parsed = serverEnvironmentSchema.safeParse(source);
  if (!parsed.success) {
    throw new EnvironmentValidationError(parsed.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`));
  }
  const environment = parsed.data;
  const issues: string[] = [];
  if (options.requireProductionOrigin && environment.NODE_ENV === "production" && !environment.APP_ORIGIN) {
    issues.push("APP_ORIGIN is required in production");
  }
  if (options.requirePayments && (!environment.STRIPE_SECRET_KEY || !environment.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY)) {
    issues.push("Stripe secret and publishable keys must both be configured");
  }
  if (environment.STORAGE_DRIVER === "s3") {
    for (const [name, value] of [
      ["S3_REGION", environment.S3_REGION],
      ["S3_PUBLIC_BUCKET", environment.S3_PUBLIC_BUCKET],
      ["S3_PRIVATE_BUCKET", environment.S3_PRIVATE_BUCKET],
      ["S3_ACCESS_KEY_ID", environment.S3_ACCESS_KEY_ID],
      ["S3_SECRET_ACCESS_KEY", environment.S3_SECRET_ACCESS_KEY],
      ["S3_PUBLIC_BASE_URL", environment.S3_PUBLIC_BASE_URL],
    ] as const) {
      if (!value) issues.push(`${name} is required when STORAGE_DRIVER=s3`);
    }
  }
  if (options.requireLegalIdentity) {
    if (!environment.LEGAL_BUSINESS_NAME) issues.push("LEGAL_BUSINESS_NAME is required");
    if (!environment.LEGAL_CONTACT_EMAIL) issues.push("LEGAL_CONTACT_EMAIL is required");
    if (!environment.LEGAL_BUSINESS_ADDRESS) issues.push("LEGAL_BUSINESS_ADDRESS is required");
  }
  if (issues.length) throw new EnvironmentValidationError(issues);
  return environment;
}

export function validateProductionReadiness(source: NodeJS.ProcessEnv = process.env) {
  const environment = validateServerEnvironment(source, {
    requireProductionOrigin: true,
    requirePayments: true,
    requireLegalIdentity: true,
  });
  const issues: string[] = [];
  if (environment.NODE_ENV !== "production") issues.push("NODE_ENV must be production");
  if (!environment.APP_ORIGIN?.startsWith("https://")) issues.push("APP_ORIGIN must use HTTPS");
  if (environment.STORAGE_DRIVER !== "s3") issues.push("STORAGE_DRIVER must be s3");
  if (!environment.STRIPE_WEBHOOK_SECRET) issues.push("STRIPE_WEBHOOK_SECRET is required");
  if (!environment.RESEND_API_KEY || !environment.ORDER_CONFIRMATION_FROM_EMAIL) issues.push("Transactional email must be configured");
  if (issues.length) throw new EnvironmentValidationError(issues);
  return environment;
}
