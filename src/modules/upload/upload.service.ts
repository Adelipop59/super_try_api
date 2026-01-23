import {
  Injectable,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { randomUUID } from 'crypto';

@Injectable()
export class UploadService {
  private s3Client: S3Client;
  private bucketName: string;
  private baseUrl: string;

  private readonly ALLOWED_MIME_TYPES = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp',
  ];

  private readonly ALLOWED_MESSAGE_MIME_TYPES = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp',
    'application/pdf',
    'video/mp4',
    'video/quicktime', // MOV
    'video/webm',
  ];

  private readonly MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
  private readonly MAX_MESSAGE_FILE_SIZE = 50 * 1024 * 1024; // 50MB pour messages (vidéos)

  constructor(private configService: ConfigService) {
    const region = this.configService.get<string>('aws.region');
    const accessKeyId = this.configService.get<string>('aws.accessKeyId');
    const secretAccessKey = this.configService.get<string>(
      'aws.secretAccessKey',
    );
    const endpoint = this.configService.get<string>('aws.endpoint');

    this.bucketName =
      this.configService.get<string>('aws.bucketName') || 'super-try-images';
    this.baseUrl =
      this.configService.get<string>('aws.baseUrl') ||
      endpoint ||
      `https://${this.bucketName}.s3.${region || 'eu-west-3'}.amazonaws.com`;

    if (!region || !accessKeyId || !secretAccessKey) {
      throw new Error(
        'AWS/S3 configuration missing. Please set AWS_S3_REGION, AWS_ACCESS_KEY_ID (or AWS_ACCES_KEY_ID), and AWS_SECRET_ACCESS_KEY (or AWS_SECRET_KEY) environment variables.',
      );
    }

    this.s3Client = new S3Client({
      region,
      endpoint: endpoint || undefined,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
      forcePathStyle: !!endpoint, // Required for Supabase Storage and MinIO
    });
  }

  /**
   * Upload a single image to S3
   */
  async uploadImage(
    file: Express.Multer.File,
    entityType: string,
    entityId?: string,
  ): Promise<string> {
    this.validateFile(file);

    const fileName = this.generateFileName(file.originalname);
    const s3Key = this.getS3Key(entityType, entityId, fileName);

    try {
      const command = new PutObjectCommand({
        Bucket: this.bucketName,
        Key: s3Key,
        Body: file.buffer,
        ContentType: file.mimetype,
        ACL: 'public-read',
      });

      await this.s3Client.send(command);

      return `${this.baseUrl}/${s3Key}`;
    } catch (error) {
      console.error('S3 upload error:', error);
      throw new InternalServerErrorException(
        'Failed to upload image to S3',
      );
    }
  }

  /**
   * Upload multiple images to S3
   */
  async uploadMultipleImages(
    files: Express.Multer.File[],
    entityType: string,
    entityId?: string,
  ): Promise<string[]> {
    if (!files || files.length === 0) {
      throw new BadRequestException('No files provided');
    }

    if (files.length > 10) {
      throw new BadRequestException('Maximum 10 images allowed per upload');
    }

    const uploadPromises = files.map((file) =>
      this.uploadImage(file, entityType, entityId),
    );

    return Promise.all(uploadPromises);
  }

  /**
   * Upload message attachment (images, PDFs, videos)
   */
  async uploadMessageAttachment(
    file: Express.Multer.File,
    sessionId: string,
  ): Promise<string> {
    this.validateMessageAttachment(file);

    const fileName = this.generateFileName(file.originalname);
    const s3Key = `messages/${sessionId}/${fileName}`;

    try {
      const command = new PutObjectCommand({
        Bucket: this.bucketName,
        Key: s3Key,
        Body: file.buffer,
        ContentType: file.mimetype,
        ACL: 'public-read',
      });

      await this.s3Client.send(command);

      return `${this.baseUrl}/${s3Key}`;
    } catch (error) {
      console.error('S3 upload error:', error);
      throw new InternalServerErrorException(
        'Failed to upload attachment to S3',
      );
    }
  }

  /**
   * Delete an image from S3
   */
  async deleteImage(imageUrl: string): Promise<void> {
    try {
      // Extract S3 key from URL
      const s3Key = this.extractS3KeyFromUrl(imageUrl);

      if (!s3Key) {
        throw new BadRequestException('Invalid image URL');
      }

      const command = new DeleteObjectCommand({
        Bucket: this.bucketName,
        Key: s3Key,
      });

      await this.s3Client.send(command);
    } catch (error) {
      console.error('S3 delete error:', error);
      throw new InternalServerErrorException(
        'Failed to delete image from S3',
      );
    }
  }

  /**
   * Validate file type and size
   */
  private validateFile(file: Express.Multer.File): void {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    if (!this.ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      throw new BadRequestException(
        `Invalid file type. Allowed types: ${this.ALLOWED_MIME_TYPES.join(', ')}`,
      );
    }

    if (file.size > this.MAX_FILE_SIZE) {
      throw new BadRequestException(
        `File size exceeds maximum allowed size of ${this.MAX_FILE_SIZE / 1024 / 1024}MB`,
      );
    }
  }

  /**
   * Validate message attachment type and size
   */
  private validateMessageAttachment(file: Express.Multer.File): void {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    if (!this.ALLOWED_MESSAGE_MIME_TYPES.includes(file.mimetype)) {
      throw new BadRequestException(
        `Invalid file type. Allowed types: ${this.ALLOWED_MESSAGE_MIME_TYPES.join(', ')}`,
      );
    }

    // Check size based on type
    const maxSize = file.mimetype.startsWith('image/')
      ? this.MAX_FILE_SIZE
      : this.MAX_MESSAGE_FILE_SIZE;

    if (file.size > maxSize) {
      throw new BadRequestException(
        `File size exceeds maximum allowed size of ${maxSize / 1024 / 1024}MB`,
      );
    }
  }

  /**
   * Generate unique filename with timestamp and UUID
   */
  private generateFileName(originalName: string): string {
    const timestamp = Date.now();
    const uuid = randomUUID();
    const extension = originalName.split('.').pop()?.toLowerCase() || 'jpg';

    return `${timestamp}-${uuid}.${extension}`;
  }

  /**
   * Get S3 key path based on entity type
   */
  private getS3Key(
    entityType: string,
    entityId: string | undefined,
    fileName: string,
  ): string {
    if (entityId) {
      return `${entityType}/${entityId}/${fileName}`;
    }
    return `${entityType}/${fileName}`;
  }

  /**
   * Extract S3 key from full URL
   */
  private extractS3KeyFromUrl(url: string): string | null {
    try {
      // Remove base URL to get the S3 key
      const key = url.replace(this.baseUrl + '/', '');
      return key !== url ? key : null;
    } catch {
      return null;
    }
  }

  /**
   * Generate a signed URL for private S3 objects
   * @param s3Key - The S3 object key (e.g., "products/abc-123.jpg")
   * @param expiresIn - Expiration time in seconds (default: 1 hour)
   * @returns Signed URL
   */
  async getSignedUrl(s3Key: string, expiresIn: number = 3600): Promise<string> {
    try {
      const command = new GetObjectCommand({
        Bucket: this.bucketName,
        Key: s3Key,
      });

      const signedUrl = await getSignedUrl(this.s3Client, command, {
        expiresIn,
      });

      return signedUrl;
    } catch (error) {
      console.error('S3 getSignedUrl error:', error);
      throw new InternalServerErrorException(
        'Failed to generate signed URL',
      );
    }
  }

  /**
   * Generate signed URLs for an array of image objects
   * @param images - Array of image objects from Product.images
   * @param expiresIn - Expiration time in seconds
   * @returns Array of image objects with signed URLs
   */
  async signImagesArray(
    images: Array<{ url: string; order: number; isPrimary: boolean }>,
    expiresIn: number = 3600,
  ): Promise<Array<{ url: string; order: number; isPrimary: boolean }>> {
    if (!images || images.length === 0) {
      return [];
    }

    const signedImages = await Promise.all(
      images.map(async (image) => {
        // Extract S3 key from URL
        const s3Key = this.extractS3KeyFromUrl(image.url);

        if (!s3Key) {
          // If it's not an S3 URL, return as-is
          return image;
        }

        // Generate signed URL
        const signedUrl = await this.getSignedUrl(s3Key, expiresIn);

        return {
          ...image,
          url: signedUrl,
        };
      }),
    );

    return signedImages;
  }
}
