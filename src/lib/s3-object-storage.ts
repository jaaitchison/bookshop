import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { validateServerEnvironment } from "@/src/lib/environment";

let cachedClient: S3Client | null = null;

function configuration() {
  const environment = validateServerEnvironment();
  if (environment.STORAGE_DRIVER !== "s3") throw new Error("S3 object storage is not configured.");
  return {
    publicBucket: environment.S3_PUBLIC_BUCKET!,
    privateBucket: environment.S3_PRIVATE_BUCKET!,
    publicBaseUrl: environment.S3_PUBLIC_BASE_URL!.replace(/\/$/, ""),
    client: cachedClient ??= new S3Client({
      region: environment.S3_REGION!,
      endpoint: environment.S3_ENDPOINT,
      credentials: {
        accessKeyId: environment.S3_ACCESS_KEY_ID!,
        secretAccessKey: environment.S3_SECRET_ACCESS_KEY!,
      },
    }),
  };
}

export function usesS3ObjectStorage() {
  return process.env.STORAGE_DRIVER === "s3";
}

export async function putObject(key: string, bytes: Uint8Array, contentType: string, access: "public" | "private") {
  const { client, publicBucket, privateBucket } = configuration();
  await client.send(new PutObjectCommand({
    Bucket: access === "public" ? publicBucket : privateBucket,
    Key: key,
    Body: bytes,
    ContentType: contentType,
    CacheControl: key.startsWith("covers/") ? "public, max-age=31536000, immutable" : "private, no-store",
  }));
}

export async function deleteObject(key: string, access: "public" | "private") {
  const { client, publicBucket, privateBucket } = configuration();
  await client.send(new DeleteObjectCommand({ Bucket: access === "public" ? publicBucket : privateBucket, Key: key }));
}

export function publicObjectUrl(key: string) {
  return `${configuration().publicBaseUrl}/${key}`;
}

export async function getPrivateObject(key: string, range?: { start: number; end: number }) {
  const { client, privateBucket } = configuration();
  const response = await client.send(new GetObjectCommand({
    Bucket: privateBucket,
    Key: key,
    Range: range ? `bytes=${range.start}-${range.end}` : undefined,
  }));
  if (!response.Body) throw new Error("Stored book file has no body.");
  const contentRange = response.ContentRange?.match(/bytes\s+\d+-\d+\/(\d+)/i);
  const sizeBytes = contentRange ? Number(contentRange[1]) : Number(response.ContentLength ?? 0);
  const contentLength = Number(response.ContentLength ?? sizeBytes);
  return {
    stream: response.Body.transformToWebStream() as ReadableStream<Uint8Array>,
    sizeBytes,
    contentLength,
  };
}
