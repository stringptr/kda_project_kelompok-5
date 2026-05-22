import { PutObjectCommand } from '@aws-sdk/client-s3';
import { s3Client } from '../config/s3';

export async function uploadChunk(blob: Blob, retries = 3): Promise<string> {
    let object_key = crypto.randomUUID();

    for (let i = 0; i < retries; i++) {
        try {
            await s3Client.send(new PutObjectCommand({
                Bucket: process.env.GARAGE_BUCKET!,
                Key: object_key,
                Body: Buffer.from(await blob.arrayBuffer()),
            }));

            return object_key;
        } catch (error) {
            if (i === retries - 1) throw error; // Lempar error jika sudah mencapai batas retry
            object_key = crypto.randomUUID(); // Coba generate UUID baru dan ulangi
        }
    }
    throw new Error("Gagal mengunggah chunk setelah beberapa kali percobaan");
}
