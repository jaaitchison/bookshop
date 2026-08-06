import "dotenv/config";
import { randomUUID } from "node:crypto";
import { GET as health } from "../app/api/health/route";
import { getBookFileStorage } from "../src/lib/book-file-storage";
import { EnvironmentValidationError, validateProductionReadiness, validateServerEnvironment } from "../src/lib/environment";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

async function main() {
  console.log("\nSECTION 12.2 - Deployment runtime verification\n");

  console.log("1. Production object-storage configuration");
  let missingRejected = false;
  try {
    validateServerEnvironment({
      NODE_ENV: "production",
      DATABASE_URL: "postgresql://user:password@example.test:5432/bookshop",
      APP_ORIGIN: "https://bookshop.example",
      STORAGE_DRIVER: "s3",
    });
  } catch (error) {
    missingRejected = error instanceof EnvironmentValidationError;
  }
  assert(missingRejected, "Incomplete S3 configuration was accepted.");
  const configured = validateServerEnvironment({
    NODE_ENV: "production",
    DATABASE_URL: "postgresql://user:password@example.test:5432/bookshop",
    APP_ORIGIN: "https://bookshop.example",
    STORAGE_DRIVER: "s3",
    S3_ENDPOINT: "https://example.r2.cloudflarestorage.com",
    S3_REGION: "auto",
    S3_PUBLIC_BUCKET: "bookshop-covers",
    S3_PRIVATE_BUCKET: "bookshop-private-files",
    S3_ACCESS_KEY_ID: "access-key-123",
    S3_SECRET_ACCESS_KEY: "secret-key-123",
    S3_PUBLIC_BASE_URL: "https://media.bookshop.example",
  });
  assert(configured.STORAGE_DRIVER === "s3", "Complete S3/R2 configuration did not parse.");
  const ready = validateProductionReadiness({
    NODE_ENV: "production",
    DATABASE_URL: "postgresql://user:password@example.test:5432/bookshop",
    APP_ORIGIN: "https://bookshop.example",
    STORAGE_DRIVER: "s3",
    S3_ENDPOINT: "https://example.r2.cloudflarestorage.com",
    S3_REGION: "auto",
    S3_PUBLIC_BUCKET: "bookshop-covers",
    S3_PRIVATE_BUCKET: "bookshop-private-files",
    S3_ACCESS_KEY_ID: "access-key-123",
    S3_SECRET_ACCESS_KEY: "secret-key-123",
    S3_PUBLIC_BASE_URL: "https://media.bookshop.example",
    STRIPE_SECRET_KEY: "sk_live_example_123",
    NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: "pk_live_example_123",
    STRIPE_WEBHOOK_SECRET: "whsec_example_123",
    RESEND_API_KEY: "resend-example-123",
    ORDER_CONFIRMATION_FROM_EMAIL: "orders@bookshop.example",
    LEGAL_BUSINESS_NAME: "Example Book Shop Limited",
    LEGAL_CONTACT_EMAIL: "privacy@bookshop.example",
    LEGAL_BUSINESS_ADDRESS: "1 Example Street, London, SW1A 1AA",
  });
  assert(ready.LEGAL_BUSINESS_NAME === "Example Book Shop Limited", "Complete launch configuration failed preflight.");
  console.log("   PASS - production storage cannot start with incomplete bucket credentials.");

  console.log("\n2. Local private-storage fallback");
  const previousDriver = process.env.STORAGE_DRIVER;
  process.env.STORAGE_DRIVER = "local";
  const storage = getBookFileStorage();
  const bytes = Buffer.from("Phase 12.2 private storage verification.");
  const stored = await storage.store({ bookId: `deployment-${randomUUID()}`, bytes, extension: "pdf" });
  try {
    const opened = await storage.open(stored.storageKey, { start: 0, end: bytes.length - 1 });
    const received = Buffer.from(await new Response(opened.stream).arrayBuffer());
    assert(received.equals(bytes), "Local private-storage fallback changed file bytes.");
  } finally {
    await stored.delete();
    if (previousDriver === undefined) delete process.env.STORAGE_DRIVER;
    else process.env.STORAGE_DRIVER = previousDriver;
  }
  console.log("   PASS - development retains private, range-capable local storage.");

  console.log("\n3. Container health contract");
  const response = await health();
  const payload = await response.json() as { status?: string; database?: string };
  assert(response.status === 200 && payload.status === "healthy" && payload.database === "connected", "Database health contract failed.");
  console.log("   PASS - the deployment health endpoint verifies PostgreSQL connectivity.");

  console.log("\nSECTION 12.2 DEPLOYMENT RUNTIME PASSED.\n");
}

main().catch((error) => {
  console.error("\nSECTION 12.2 DEPLOYMENT RUNTIME FAILED.");
  console.error(error);
  process.exitCode = 1;
});
