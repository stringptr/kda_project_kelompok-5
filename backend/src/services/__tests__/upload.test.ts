import { describe, it, expect, mock } from "bun:test";

const mockSend = mock(() => Promise.resolve({}));

mock.module("../../config/s3", () => ({
  s3Client: { send: mockSend },
  garageBucket: "test-bucket",
}));

const { uploadChunk } = await import("../upload");

describe("uploadChunk", () => {
  it("returns an object key on success", async () => {
    mockSend.mockImplementationOnce(() => Promise.resolve({}));

    const key = await uploadChunk(new Blob(["test data"]));

    expect(typeof key).toBe("string");
    expect(key.length).toBeGreaterThan(0);
    expect(mockSend).toHaveBeenCalled();
  });

  it("retries with a new UUID on failure", async () => {
    let call = 0;
    mockSend.mockImplementation(() => {
      call++;
      if (call === 1) return Promise.reject(new Error("S3 error"));
      return Promise.resolve({});
    });

    const key = await uploadChunk(new Blob(["data"]));

    expect(typeof key).toBe("string");
    expect(key.length).toBeGreaterThan(0);
  });

  it("throws after exhausting retries", async () => {
    mockSend.mockImplementation(() => Promise.reject(new Error("persistent error")));

    expect(uploadChunk(new Blob(["x"]))).rejects.toThrow("persistent error");
  });
});
