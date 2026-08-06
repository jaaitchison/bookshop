import "dotenv/config";
import { validateProductionReadiness } from "../src/lib/environment";

try {
  const environment = validateProductionReadiness();
  console.log("Production preflight passed.");
  console.log(`Origin: ${environment.APP_ORIGIN}`);
  console.log(`Storage: separate ${environment.S3_PUBLIC_BUCKET} / ${environment.S3_PRIVATE_BUCKET} buckets`);
  console.log(`Legal operator: ${environment.LEGAL_BUSINESS_NAME}`);
} catch (error) {
  console.error("Production preflight failed.");
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
}
