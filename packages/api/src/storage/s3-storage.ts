import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
  CopyObjectCommand,
} from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import fs from 'fs';
import path from 'path';

export interface S3Config {
  provider: 'minio' | 'aws' | 'digitalocean' | 'cloudflare' | 'backblaze';
  endpoint?: string;
  accessKey: string;
  secretKey: string;
  bucket: string;
  region: string;
  publicUrl?: string;
}

export class S3Storage {
  private client: S3Client;
  private bucket: string;
  private publicUrl: string;

  constructor(config: S3Config) {
    const clientConfig: any = {
      region: config.region,
      credentials: {
        accessKeyId: config.accessKey,
        secretAccessKey: config.secretKey,
      },
    };

    // For MinIO and other S3-compatible services
    if (config.endpoint) {
      clientConfig.endpoint = config.endpoint;
      clientConfig.forcePathStyle = true; // Required for MinIO
    }

    this.client = new S3Client(clientConfig);
    this.bucket = config.bucket;
    this.publicUrl = config.publicUrl || '';
  }

  /**
   * Initialize storage (create bucket if needed)
   */
  async initialize(): Promise<void> {
    try {
      // Try to head bucket
      await this.client.send(
        new HeadObjectCommand({
          Bucket: this.bucket,
          Key: '.reportcast',
        })
      );
    } catch (error: any) {
      if (error.name === 'NoSuchBucket' || error.name === 'NotFound') {
        // Bucket doesn't exist, create it
        const { CreateBucketCommand } = await import('@aws-sdk/client-s3');
        await this.client.send(new CreateBucketCommand({ Bucket: this.bucket }));
        console.log(`✅ Created S3 bucket: ${this.bucket}`);
      }
    }
  }

  /**
   * Upload file from local path
   */
  async uploadFile(
    localPath: string,
    s3Key: string,
    options?: {
      contentType?: string;
      isPublic?: boolean;
      metadata?: Record<string, string>;
    }
  ): Promise<string> {
    const fileStream = fs.createReadStream(localPath);
    const stats = fs.statSync(localPath);

    const upload = new Upload({
      client: this.client,
      params: {
        Bucket: this.bucket,
        Key: s3Key,
        Body: fileStream,
        ContentType: options?.contentType || 'application/octet-stream',
        ContentLength: stats.size,
        ACL: options?.isPublic ? 'public-read' : 'private',
        Metadata: options?.metadata,
      },
    });

    await upload.done();

    return this.getPublicUrl(s3Key);
  }

  /**
   * Upload buffer
   */
  async uploadBuffer(
    buffer: Buffer,
    s3Key: string,
    options?: {
      contentType?: string;
      isPublic?: boolean;
      metadata?: Record<string, string>;
    }
  ): Promise<string> {
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: s3Key,
        Body: buffer,
        ContentType: options?.contentType || 'application/octet-stream',
        ACL: options?.isPublic ? 'public-read' : 'private',
        Metadata: options?.metadata,
      })
    );

    return this.getPublicUrl(s3Key);
  }

  /**
   * Download file to local path
   */
  async downloadFile(s3Key: string, localPath: string): Promise<void> {
    const response = await this.client.send(
      new GetObjectCommand({
        Bucket: this.bucket,
        Key: s3Key,
      })
    );

    if (!response.Body) {
      throw new Error('Empty response body');
    }

    const writeStream = fs.createWriteStream(localPath);
    
    // @ts-ignore - Body is a readable stream
    await new Promise((resolve, reject) => {
      response.Body.pipe(writeStream)
        .on('finish', resolve)
        .on('error', reject);
    });
  }

  /**
   * Get file as buffer
   */
  async getBuffer(s3Key: string): Promise<Buffer> {
    const response = await this.client.send(
      new GetObjectCommand({
        Bucket: this.bucket,
        Key: s3Key,
      })
    );

    if (!response.Body) {
      throw new Error('Empty response body');
    }

    // @ts-ignore
    const chunks: Buffer[] = [];
    for await (const chunk of response.Body) {
      chunks.push(chunk);
    }

    return Buffer.concat(chunks);
  }

  /**
   * Delete file
   */
  async deleteFile(s3Key: string): Promise<void> {
    await this.client.send(
      new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: s3Key,
      })
    );
  }

  /**
   * Check if file exists
   */
  async fileExists(s3Key: string): Promise<boolean> {
    try {
      await this.client.send(
        new HeadObjectCommand({
          Bucket: this.bucket,
          Key: s3Key,
        })
      );
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get file metadata
   */
  async getMetadata(s3Key: string): Promise<{
    size: number;
    contentType: string;
    lastModified: Date;
    metadata?: Record<string, string>;
  }> {
    const response = await this.client.send(
      new HeadObjectCommand({
        Bucket: this.bucket,
        Key: s3Key,
      })
    );

    return {
      size: response.ContentLength || 0,
      contentType: response.ContentType || 'application/octet-stream',
      lastModified: response.LastModified || new Date(),
      metadata: response.Metadata,
    };
  }

  /**
   * Generate presigned URL for download
   */
  async getPresignedUrl(
    s3Key: string,
    expiresIn: number = 3600
  ): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: s3Key,
    });

    return await getSignedUrl(this.client, command, { expiresIn });
  }

  /**
   * Get public URL (for public files)
   */
  getPublicUrl(s3Key: string): string {
    if (this.publicUrl) {
      return `${this.publicUrl}/${this.bucket}/${s3Key}`;
    }

    // AWS S3 default
    return `https://${this.bucket}.s3.${this.client.config.region}.amazonaws.com/${s3Key}`;
  }

  /**
   * Copy file within bucket
   */
  async copyFile(sourceKey: string, destKey: string): Promise<void> {
    await this.client.send(
      new CopyObjectCommand({
        Bucket: this.bucket,
        CopySource: `${this.bucket}/${sourceKey}`,
        Key: destKey,
      })
    );
  }
}

// Singleton instance
let storageInstance: S3Storage | null = null;

export function getStorage(): S3Storage {
  if (!storageInstance) {
    const config: S3Config = {
      provider: (process.env.S3_PROVIDER as any) || 'minio',
      endpoint: process.env.S3_ENDPOINT,
      accessKey: process.env.S3_ACCESS_KEY || 'minioadmin',
      secretKey: process.env.S3_SECRET_KEY || 'minioadmin',
      bucket: process.env.S3_BUCKET || 'reportcast',
      region: process.env.S3_REGION || 'us-east-1',
      publicUrl: process.env.S3_PUBLIC_URL,
    };

    storageInstance = new S3Storage(config);
  }

  return storageInstance;
}

export async function initializeStorage(): Promise<void> {
  const storage = getStorage();
  await storage.initialize();
  console.log('✅ S3 storage initialized');
}
