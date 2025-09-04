import { requireAuth, BadRequestError } from '@jjmauction/common';
import express, { Request, Response } from 'express';
import { Profile } from '../models';
import { uploadToS3, generateImageUrls } from '../utils/s3-config';

// Define S3 file interface
interface S3File extends Express.Multer.File {
  key: string;
  location: string;
  bucket: string;
}

// Extend Request interface
interface MulterS3Request extends Request {
  file?: S3File;
}

const router = express.Router();

router.post(
  '/api/profile/image',
  requireAuth,
  (req, res, next) => {
    // Use multer-s3 to handle the upload
    uploadToS3.single('image')(req, res, (err) => {
      if (err) {
        console.error('=== PROFILE IMAGE UPLOAD ERROR ===');
        console.error('Error message:', err.message);
        return res.status(400).json({
          errors: [
            { message: 'Image upload failed: ' + err.message, field: 'image' },
          ],
        });
      }
      next();
    });
  },
  async (req: MulterS3Request, res: Response) => {
    try {
      if (!req.file) {
        throw new BadRequestError('Image file is required');
      }

      const profile = await Profile.findOne({
        where: { userId: req.currentUser.id },
      });

      if (!profile) {
        throw new BadRequestError('Profile not found');
      }

      // Generate image URLs from S3 location
      const bucketName = process.env.AWS_S3_BUCKET_NAME;
      if (!bucketName) {
        throw new BadRequestError('S3 bucket not configured');
      }

      const imageUrls = await generateImageUrls(req.file.key, bucketName);

      // Update profile with new image ID
      await profile.update({
        imageId: req.file.key
      });

      res.status(200).send({
        imageId: req.file.key,
        imageUrl: imageUrls.small
      });
    } catch (error) {
      console.error('Profile image upload error:', error);
      res.status(400).send({
        errors: [{ message: error.message }]
      });
    }
  }
);

export { router as uploadProfileImageRouter };
