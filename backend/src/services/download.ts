import { GetObjectCommand, S3ServiceException } from "@aws-sdk/client-s3";
import { garageBucket, s3Client } from "../config/s3";

export async function downloadChunk(objectKey: string): Promise<{
  bytes: Uint8Array;
  contentType: string;
  contentLength?: number;
  etag?: string;
}> {
  try {
    const result = await s3Client.send(
      new GetObjectCommand({
        Bucket: garageBucket,
        Key: objectKey,
      })
    );

    if (!result.Body) {
      throw new Error("Object body is empty");
    }

    const bytes = await result.Body.transformToByteArray();

    return {
      bytes,
      contentType: result.ContentType || "application/octet-stream",
      contentLength: result.ContentLength,
      etag: result.ETag,
    };
  } catch (error) {
    if (
      error instanceof S3ServiceException &&
      (error.name === "NoSuchKey" ||
        error.name === "NotFound" ||
        error.$metadata.httpStatusCode === 404)
    ) {
      const notFoundError = new Error("Object not found");
      notFoundError.name = "ObjectNotFound";
      throw notFoundError;
    }

    throw error;
  }
}