import { Elysia } from "elysia";
import { cors } from "@elysiajs/cors";
import { uploadChunk } from './services/upload';
import { openapi, fromTypes } from '@elysia/openapi'

const app = new Elysia()
    .use(cors())
    .use(
        openapi({
            references: fromTypes(
                process.env.NODE_ENV === 'production'
                    ? 'dist/index.d.ts'
                    : 'src/index.ts'
            )
        })
    )
    .get("/", () => "Service Healthy. Milik Kelompok 5 KDA :)")
    .post('/upload', async ({ request }) => {
        try {
            const blob = await request.blob();
            const object_key = await uploadChunk(blob);
            return { success: true, object_key };
        } catch (err: any) {
            return {
                success: false,
                error: err.message || 'Upload failed',
                details: err.code || 'Unknown'
            };
        }
    })
    .listen(3000);

console.log(
    `🦊 Elysia is running at ${app.server?.hostname}:${app.server?.port}`
);