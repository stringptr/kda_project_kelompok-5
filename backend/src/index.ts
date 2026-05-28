import { Elysia, t } from "elysia";
import { openapi, fromTypes } from "@elysia/openapi";
import { uploadChunk } from "./services/upload";
import { downloadChunk } from "./services/download";

const app = new Elysia()
  .use(
    openapi({
      references: fromTypes(
        process.env.NODE_ENV === "production"
          ? "dist/index.d.ts"
          : "src/index.ts"
      ),
    })
  )

  .get("/", () => "Service Healthy.\nMilik Kelompok 5 KDA :)")

  .get("/health", () => ({
    service: "backend",
    status: "ok",
  }))

  .post("/upload", async ({ request, set }) => {
    try {
      const blob = await request.blob();
      const object_key = await uploadChunk(blob);

      set.status = 201;

      return {
        success: true,
        object_key,
      };
    } catch (err: any) {
      set.status = 500;

      return {
        success: false,
        error: err.message || "Upload failed",
        details: err.code || "Unknown",
      };
    }
  })

  .get(
    "/download/:object_key",
    async ({ params, set }) => {
      try {
        const objectKey = params.object_key;
        const downloaded = await downloadChunk(objectKey);

        const headers = new Headers();

        headers.set("Content-Type", downloaded.contentType);
        headers.set(
          "Content-Disposition",
          `attachment; filename="${objectKey}.encrypted"`
        );
        headers.set("X-Object-Key", objectKey);

        if (downloaded.contentLength !== undefined) {
          headers.set("Content-Length", String(downloaded.contentLength));
        }

        if (downloaded.etag) {
          headers.set("ETag", downloaded.etag);
        }

        const body = downloaded.bytes.buffer.slice(
        downloaded.bytes.byteOffset,
        downloaded.bytes.byteOffset + downloaded.bytes.byteLength
        ) as ArrayBuffer;

        return new Response(body, {
        status: 200,
        headers,
        });
      } catch (err: any) {
        if (err.name === "ObjectNotFound") {
          set.status = 404;

          return {
            success: false,
            error: "Object not found",
            object_key: params.object_key,
          };
        }

        set.status = 500;

        return {
          success: false,
          error: err.message || "Download failed",
          details: err.code || "Unknown",
        };
      }
    },
    {
      params: t.Object({
        object_key: t.String({
          minLength: 1,
        }),
      }),
    }
  )

  .listen(3000);

console.log(
  `🦊 Elysia is running at ${app.server?.hostname}:${app.server?.port}`
);
