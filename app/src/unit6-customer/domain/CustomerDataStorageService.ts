import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

@Injectable()
export class CustomerDataStorageService {
  private readonly s3: S3Client;
  private readonly bucket: string;

  constructor(private readonly config: ConfigService) {
    this.s3 = new S3Client({});
    this.bucket = this.config.get<string>('CUSTOMER_DATA_BUCKET') || '';
  }

  /**
   * Upload note/record content to S3.
   */
  async uploadNote(s3Key: string, content: string): Promise<void> {
    await this.s3.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: s3Key,
        Body: content,
        ContentType: 'text/plain; charset=utf-8',
      }),
    );
  }

  /**
   * Download note/record content from S3.
   */
  async downloadNote(s3Key: string): Promise<string> {
    const response = await this.s3.send(
      new GetObjectCommand({
        Bucket: this.bucket,
        Key: s3Key,
      }),
    );
    return (await response.Body?.transformToString('utf-8')) || '';
  }

  /**
   * Delete note/record content from S3.
   */
  async deleteNote(s3Key: string): Promise<void> {
    await this.s3.send(
      new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: s3Key,
      }),
    );
  }

  /**
   * Upload an attachment buffer to S3.
   */
  async uploadAttachment(
    s3Key: string,
    buffer: Buffer,
    contentType: string,
  ): Promise<void> {
    await this.s3.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: s3Key,
        Body: buffer,
        ContentType: contentType,
      }),
    );
  }

  /**
   * Delete an attachment from S3.
   */
  async deleteAttachment(s3Key: string): Promise<void> {
    await this.s3.send(
      new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: s3Key,
      }),
    );
  }

  /**
   * Generate a presigned GET URL for downloading/viewing a file.
   */
  async getDownloadUrl(s3Key: string, fileName: string): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: s3Key,
    });
    return getSignedUrl(this.s3, command, { expiresIn: 3600 });
  }

  /**
   * Generate a presigned PUT URL for uploading a file.
   */
  async getUploadUrl(s3Key: string, contentType: string): Promise<string> {
    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: s3Key,
      ContentType: contentType,
    });
    return getSignedUrl(this.s3, command, { expiresIn: 3600 });
  }
}
