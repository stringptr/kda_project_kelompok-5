import { S3Client } from "@aws-sdk/client-s3";

function requiredEnv(name: string): string {
  const value = process.env[name];

  if (!value || value.trim() === "") {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

const accessKeyId = requiredEnv("GARAGE_DEFAULT_ACCESS_KEY");

export const garageBucket =
  process.env.GARAGE_BUCKET ||
  process.env.GARAGE_DEFAULT_BUCKET ||
  "default";

export const s3Client = new S3Client({
  endpoint: requiredEnv("GARAGE_ENDPOINT"),
  region: process.env.GARAGE_REGION || "garage",
  credentials: {
    accessKeyId,
    secretAccessKey: requiredEnv("GARAGE_DEFAULT_SECRET_KEY"),
  },
  forcePathStyle: true,
});
