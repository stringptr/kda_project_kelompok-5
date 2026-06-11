import { describe, it, expect, mock } from "bun:test";
import { S3ServiceException } from "@aws-sdk/client-s3";

const mockSend = mock(() => Promise.resolve({}));

mock.module("../../config/s3", () => ({
  s3Client: { send: mockSend },
  garageBucket: "test-bucket",
}));

const { downloadChunk } = await import("../download");

function s3Result(overrides = {}) {
  return {
    Body: { transformToByteArray: () => Promise.resolve(new Uint8Array([1, 2, 3])) },
    ContentType: "application/octet-stream",
    ContentLength: 3,
    ETag: '"abc123"',
    ...overrides,
  };
}

describe("downloadChunk", () => {
  it("returns bytes and metadata on success", async () => {
    mockSend.mockImplementationOnce(() => Promise.resolve(s3Result()));

    const result = await downloadChunk("some-key");

    expect(result.bytes).toEqual(new Uint8Array([1, 2, 3]));
    expect(result.contentType).toBe("application/octet-stream");
    expect(result.contentLength).toBe(3);
    expect(result.etag).toBe('"abc123"');
  });

  it("throws ObjectNotFound when S3 returns NoSuchKey", async () => {
    mockSend.mockImplementationOnce(() =>
      Promise.reject(
        new S3ServiceException({ name: "NoSuchKey", message: "NoSuchKey", $metadata: { httpStatusCode: 404 } }),
      ),
    );

    try {
      await downloadChunk("missing-key");
      expect.unreachable("should have thrown");
    } catch (err: any) {
      expect(err.name).toBe("ObjectNotFound");
      expect(err.message).toBe("Object not found");
    }
  });

  it("throws ObjectNotFound when S3 returns NotFound", async () => {
    mockSend.mockImplementationOnce(() =>
      Promise.reject(
        new S3ServiceException({ name: "NotFound", message: "NotFound", $metadata: { httpStatusCode: 404 } }),
      ),
    );

    try {
      await downloadChunk("missing-key");
      expect.unreachable("should have thrown");
    } catch (err: any) {
      expect(err.name).toBe("ObjectNotFound");
    }
  });

  it("propagates non-404 S3 errors", async () => {
    mockSend.mockImplementationOnce(() =>
      Promise.reject(
        new S3ServiceException({ name: "AccessDenied", message: "AccessDenied", $metadata: { httpStatusCode: 403 } }),
      ),
    );

    expect(downloadChunk("no-access")).rejects.toThrow("AccessDenied");
  });
});
