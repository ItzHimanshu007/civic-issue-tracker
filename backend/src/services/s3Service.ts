import AWS from 'aws-sdk';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../utils/logger';
import sharp from 'sharp';

interface UploadResult {
  success: boolean;
  data?: {
    url: string;
    key: string;
    thumbnailUrl?: string;
    thumbnailKey?: string;
  };
  message?: string;
}

interface FileUpload {
  buffer: Buffer;
  originalName: string;
  mimeType: string;
  size: number;
}

export class S3Service {
  private s3: AWS.S3;
  private bucketName: string;

  constructor() {
    const region = process.env.AWS_REGION || 'us-east-1';
    this.bucketName = process.env.AWS_S3_BUCKET || 'civic-tracker-media';

    this.s3 = new AWS.S3({
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      region: region,
    });

    logger.info('S3 service initialized', { bucketName: this.bucketName, region });
  }

  /**
   * Upload file to S3
   */
  async uploadFile(file: FileUpload, folder: string = 'uploads'): Promise<UploadResult> {
    try {
      const fileExtension = file.originalName.split('.').pop() || '';
      const key = `${folder}/${uuidv4()}.${fileExtension}`;

      const uploadParams: AWS.S3.PutObjectRequest = {
        Bucket: this.bucketName,
        Key: key,
        Body: file.buffer,
        ContentType: file.mimeType,
        ACL: 'public-read',
        Metadata: {
          originalName: file.originalName,
          uploadedAt: new Date().toISOString(),
        },
      };

      const result = await this.s3.upload(uploadParams).promise();
      
      let thumbnailUrl: string | undefined;
      let thumbnailKey: string | undefined;

      // Generate thumbnail for images
      if (file.mimeType.startsWith('image/')) {
        const thumbnailResult = await this.generateThumbnail(file, folder);
        if (thumbnailResult.success) {
          thumbnailUrl = thumbnailResult.data?.url;
          thumbnailKey = thumbnailResult.data?.key;
        }
      }

      logger.info('File uploaded successfully', { key, size: file.size });

      return {
        success: true,
        data: {
          url: result.Location,
          key: result.Key,
          thumbnailUrl,
          thumbnailKey,
        },
      };
    } catch (error) {
      logger.error('File upload error:', error);
      return {
        success: false,
        message: 'Failed to upload file',
      };
    }
  }

  /**
   * Generate thumbnail for images
   */
  private async generateThumbnail(file: FileUpload, folder: string): Promise<UploadResult> {
    try {
      // Generate thumbnail (300x300)
      const thumbnailBuffer = await sharp(file.buffer)
        .resize(300, 300, {
          fit: 'cover',
          position: 'center',
        })
        .jpeg({ quality: 80 })
        .toBuffer();

      const fileExtension = file.originalName.split('.').pop() || '';
      const thumbnailKey = `${folder}/thumbnails/${uuidv4()}-thumb.jpg`;

      const uploadParams: AWS.S3.PutObjectRequest = {
        Bucket: this.bucketName,
        Key: thumbnailKey,
        Body: thumbnailBuffer,
        ContentType: 'image/jpeg',
        ACL: 'public-read',
        Metadata: {
          originalName: `thumb-${file.originalName}`,
          uploadedAt: new Date().toISOString(),
        },
      };

      const result = await this.s3.upload(uploadParams).promise();

      return {
        success: true,
        data: {
          url: result.Location,
          key: result.Key,
        },
      };
    } catch (error) {
      logger.error('Thumbnail generation error:', error);
      return {
        success: false,
        message: 'Failed to generate thumbnail',
      };
    }
  }

  /**
   * Delete file from S3
   */
  async deleteFile(key: string): Promise<boolean> {
    try {
      await this.s3.deleteObject({
        Bucket: this.bucketName,
        Key: key,
      }).promise();

      logger.info('File deleted successfully', { key });
      return true;
    } catch (error) {
      logger.error('File deletion error:', error);
      return false;
    }
  }

  /**
   * Delete multiple files from S3
   */
  async deleteFiles(keys: string[]): Promise<boolean> {
    try {
      if (keys.length === 0) return true;

      await this.s3.deleteObjects({
        Bucket: this.bucketName,
        Delete: {
          Objects: keys.map(key => ({ Key: key })),
        },
      }).promise();

      logger.info('Files deleted successfully', { count: keys.length });
      return true;
    } catch (error) {
      logger.error('Multiple file deletion error:', error);
      return false;
    }
  }

  /**
   * Get signed URL for temporary access
   */
  getSignedUrl(key: string, expiresIn: number = 3600): string {
    try {
      return this.s3.getSignedUrl('getObject', {
        Bucket: this.bucketName,
        Key: key,
        Expires: expiresIn,
      });
    } catch (error) {
      logger.error('Signed URL generation error:', error);
      throw new Error('Failed to generate signed URL');
    }
  }

  /**
   * Check if file exists
   */
  async fileExists(key: string): Promise<boolean> {
    try {
      await this.s3.headObject({
        Bucket: this.bucketName,
        Key: key,
      }).promise();
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get file metadata
   */
  async getFileMetadata(key: string): Promise<any> {
    try {
      const result = await this.s3.headObject({
        Bucket: this.bucketName,
        Key: key,
      }).promise();
      return result;
    } catch (error) {
      logger.error('Get file metadata error:', error);
      return null;
    }
  }

  /**
   * Upload multiple files
   */
  async uploadMultipleFiles(files: FileUpload[], folder: string = 'uploads'): Promise<UploadResult[]> {
    const uploadPromises = files.map(file => this.uploadFile(file, folder));
    return Promise.all(uploadPromises);
  }
}

export const s3Service = new S3Service();
