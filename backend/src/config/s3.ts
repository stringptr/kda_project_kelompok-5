import { S3Client } from '@aws-sdk/client-s3';

export const s3Client = new S3Client({
    endpoint: process.env.GARAGE_ENDPOINT,
    region: process.env.GARAGE_REGION,
    credentials: {
        accessKeyId: 'GK' + process.env.GARAGE_DEFAULT_ACCESS_KEY!,
        secretAccessKey: process.env.GARAGE_DEFAULT_SECRET_KEY!,
    },
    forcePathStyle: true,
});
