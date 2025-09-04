import { NotFoundError, requireAuth } from '@jjmauction/common';
import express, { Request, Response } from 'express';

import { Profile } from '../models';
import { generateImageUrls } from '../utils/s3-config';

const router = express.Router();

router.get(
  '/api/profile/',
  requireAuth,
  async (req: Request, res: Response) => {
    const profile = await Profile.findOne({
      where: { userId: req.currentUser.id },
    });

    console.log(req.currentUser.id);
    console.log(profile);

    if (!profile) {
      throw new NotFoundError();
    }

    // If profile has image, generate URL
    const profileData = profile.toJSON();
    
    if (profile.imageId) {
      const bucketName = process.env.AWS_S3_BUCKET_NAME;
      if (bucketName) {
        try {
          const imageUrls = await generateImageUrls(profile.imageId, bucketName);
          (profileData as any).imageUrl = imageUrls.small;
        } catch (error) {
          console.error(`Failed to generate image URL for profile ${profile.id}:`, error);
        }
      }
    }

    res.status(200).send(profileData);
  }
);

export { router as getProfileRouter };
