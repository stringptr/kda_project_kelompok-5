import { describe, it, expect, mock, afterEach } from "bun:test";
import { S3ServiceException } from "@aws-sdk/client-s3";

process.env.GARAGE_ENDPOINT = "http://localhost:3900";
process.env.GARAGE_DEFAULT_ACCESS_KEY = "GKtestaccess";
process.env.GARAGE_DEFAULT_SECRET_KEY = "testsecret";
process.env.NODE_ENV = "test";

const mockSend = mock(() => Promise.resolve({}));

mock.module("../config/s3", () => ({
  s3Client: { send: mockSend },
  garageBucket: "test-bucket",
}));

const { default: app } = await import("../index");

function s3Result(overrides = {}) {
  return {
    Body: { transformToByteArray: () => Promise.resolve(new Uint8Array([1, 2, 3])) },
    ContentType: "application/octet-stream",
    ContentLength: 3,
    ETag: '"abc123"',
    ...overrides,
  };
}

describe("API", () => {
  afterEach(() => mockSend.mockReset());

  it("GET / returns health string", async () => {
    const res = await app.handle(new Request("http://localhost/"));
    const text = await res.text();

    expect(res.status).toBe(200);
    expect(text).toContain("Service Healthy");
  });

  it("GET /health returns JSON status", async () => {
    const res = await app.handle(new Request("http://localhost/health"));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toEqual({ service: "backend", status: "ok" });
  });

  it("POST /upload returns 201 with object_key", async () => {
    mockSend.mockImplementationOnce(() => Promise.resolve({}));

    const res = await app.handle(
      new Request("http://localhost/upload", {
        method: "POST",
        body: new Blob(["chunk data"]),
      }),
    );
    const body = await res.json();

    expect(res.status).toBe(201);
    expect(body.success).toBe(true);
    expect(typeof body.object_key).toBe("string");
    expect(body.object_key.length).toBeGreaterThan(0);
    expect(mockSend).toHaveBeenCalled();
  });

  it("POST /upload returns 500 on S3 error", async () => {
    mockSend.mockImplementation(() => Promise.reject(new Error("S3 failure")));

    const res = await app.handle(
      new Request("http://localhost/upload", {
        method: "POST",
        body: new Blob(["x"]),
      }),
    );
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body.success).toBe(false);
    expect(body.error).toBe("S3 failure");
  });

  it("GET /download/:key returns bytes", async () => {
    mockSend.mockImplementationOnce(() => Promise.resolve(s3Result()));

    const res = await app.handle(new Request("http://localhost/download/some-key"));
    const bytes = await res.arrayBuffer();

    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("application/octet-stream");
    expect(res.headers.get("X-Object-Key")).toBe("some-key");
    expect(new Uint8Array(bytes)).toEqual(new Uint8Array([1, 2, 3]));
  });

  it("GET /download/:key returns 404 for missing key", async () => {
    mockSend.mockImplementationOnce(() =>
      Promise.reject(
        new S3ServiceException({ name: "NoSuchKey", message: "NoSuchKey", $metadata: { httpStatusCode: 404 } }),
      ),
    );

    const res = await app.handle(new Request("http://localhost/download/missing"));
    const body = await res.json();

    expect(res.status).toBe(404);
    expect(body.success).toBe(false);
    expect(body.error).toBe("Object not found");
  });
});
