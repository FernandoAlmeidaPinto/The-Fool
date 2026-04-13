import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  CreateBucketCommand,
  HeadBucketCommand,
  PutBucketPolicyCommand,
} from "@aws-sdk/client-s3";

const endpoint = process.env.S3_ENDPOINT!;
const bucket = process.env.S3_BUCKET!;
const isR2 = Boolean(process.env.S3_R2);

const s3 = new S3Client({
  endpoint,
  region: process.env.S3_REGION ?? "us-east-1",
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY!,
    secretAccessKey: process.env.S3_SECRET_KEY!,
  },
  forcePathStyle: true,
});

export function getS3Client() {
  return s3;
}

export function getS3Bucket() {
  return bucket;
}

async function ensureBucket() {
  // R2 buckets are pre-created; skip auto-provisioning.
  if (isR2) return;

  try {
    await s3.send(new HeadBucketCommand({ Bucket: bucket }));
  } catch {
    await s3.send(new CreateBucketCommand({ Bucket: bucket }));
    await s3.send(
      new PutBucketPolicyCommand({
        Bucket: bucket,
        Policy: JSON.stringify({
          Version: "2012-10-17",
          Statement: [
            {
              Effect: "Allow",
              Principal: "*",
              Action: ["s3:GetObject"],
              Resource: [`arn:aws:s3:::${bucket}/*`],
            },
          ],
        }),
      })
    );
  }
}

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_SIZE = 5 * 1024 * 1024;

export function validateImage(file: File): string | null {
  if (!ALLOWED_TYPES.includes(file.type)) {
    return "Formato inválido. Use JPEG, PNG ou WebP.";
  }
  if (file.size > MAX_SIZE) {
    return "Arquivo muito grande. Máximo 5MB.";
  }
  return null;
}

/**
 * Process a card image: resize and center-crop to the given dimensions.
 * Output is always JPEG for consistency and smaller file size.
 */
export async function processCardImage(
  buffer: Buffer,
  width: number = 600,
  height: number = 900
): Promise<Buffer> {
  const sharp = (await import("sharp")).default;
  return sharp(buffer)
    .resize(width, height, {
      fit: "cover",
      position: "centre",
    })
    .jpeg({ quality: 85 })
    .toBuffer();
}

export async function uploadFile(
  buffer: Buffer,
  key: string,
  contentType: string
): Promise<string> {
  await ensureBucket();
  await s3.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: buffer,
      ContentType: contentType,
    })
  );
  return key;
}

export async function deleteFile(key: string): Promise<void> {
  await s3.send(
    new DeleteObjectCommand({
      Bucket: bucket,
      Key: key,
    })
  );
}

/**
 * Resolve a storage key to a URL for rendering in `<img src>`.
 * Always routes through the API proxy so images are never exposed publicly.
 * Returns null if the key is falsy.
 */
export function getImageUrl(key: string | null | undefined): string | null {
  if (!key) return null;
  return `/api/storage/${key}`;
}
