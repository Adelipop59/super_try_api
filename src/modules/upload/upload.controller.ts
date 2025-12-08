import {
  Controller,
  Post,
  Delete,
  Body,
  UploadedFile,
  UploadedFiles,
  UseInterceptors,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { UploadService } from './upload.service';
import { SupabaseAuthGuard } from '../../common/guards/supabase-auth.guard';

@ApiTags('Upload')
@Controller('upload')
@UseGuards(SupabaseAuthGuard)
export class UploadController {
  constructor(private readonly uploadService: UploadService) {}

  @Post('image')
  @ApiOperation({ summary: 'Upload a single image' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
        entityType: {
          type: 'string',
          example: 'products',
        },
        entityId: {
          type: 'string',
          example: '123e4567-e89b-12d3-a456-426614174000',
        },
      },
      required: ['file', 'entityType'],
    },
  })
  @UseInterceptors(FileInterceptor('file'))
  async uploadImage(
    @UploadedFile() file: Express.Multer.File,
    @Body('entityType') entityType: string,
    @Body('entityId') entityId?: string,
  ) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    if (!entityType) {
      throw new BadRequestException('entityType is required');
    }

    const url = await this.uploadService.uploadImage(file, entityType, entityId);

    return {
      url,
      message: 'Image uploaded successfully',
    };
  }

  @Post('images')
  @ApiOperation({ summary: 'Upload multiple images' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        files: {
          type: 'array',
          items: {
            type: 'string',
            format: 'binary',
          },
        },
        entityType: {
          type: 'string',
          example: 'products',
        },
        entityId: {
          type: 'string',
          example: '123e4567-e89b-12d3-a456-426614174000',
        },
      },
      required: ['files', 'entityType'],
    },
  })
  @UseInterceptors(FilesInterceptor('files', 10))
  async uploadImages(
    @UploadedFiles() files: Express.Multer.File[],
    @Body('entityType') entityType: string,
    @Body('entityId') entityId?: string,
  ) {
    if (!files || files.length === 0) {
      throw new BadRequestException('No files uploaded');
    }

    if (!entityType) {
      throw new BadRequestException('entityType is required');
    }

    const urls = await this.uploadService.uploadMultipleImages(
      files,
      entityType,
      entityId,
    );

    return {
      urls,
      count: urls.length,
      message: `${urls.length} image(s) uploaded successfully`,
    };
  }

  @Delete('image')
  @ApiOperation({ summary: 'Delete an image from S3' })
  async deleteImage(@Body('imageUrl') imageUrl: string) {
    if (!imageUrl) {
      throw new BadRequestException('imageUrl is required');
    }

    await this.uploadService.deleteImage(imageUrl);

    return {
      message: 'Image deleted successfully',
    };
  }
}
