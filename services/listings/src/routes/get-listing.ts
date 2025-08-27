import { NotFoundError } from '@jjmauction/common';
import express, { Request, Response } from 'express';
import { Sequelize } from 'sequelize';

import { Listing, User } from '../models';
import { generateImageUrls } from '../utils/s3-config';

const router = express.Router();

router.get(
  '/api/listings/:listingSlug',
  async (req: Request, res: Response) => {
    const listingSlug = req.params.listingSlug;

    const listing = await Listing.findOne({
      include: {
        model: User,
        as: 'User', // Use the alias defined in the association
      },
      where: { slug: listingSlug },
    });

    if (!listing) {
      throw new NotFoundError();
    }

    // Refresh S3 URLs to ensure they haven't expired
    const bucketName = process.env.AWS_S3_BUCKET_NAME;
    if (bucketName && listing.imageId) {
      try {
        const refreshedUrls = await generateImageUrls(listing.imageId, bucketName);
        const refreshedListing = {
          ...listing.toJSON(),
          smallImage: refreshedUrls.small,
          largeImage: refreshedUrls.large,
          imageUrl: refreshedUrls.large, // For backward compatibility
        };
        return res.status(200).send(refreshedListing);
      } catch (error) {
        console.error('Error refreshing URLs for listing:', listing.id, error);
      }
    }

    res.status(200).send(listing);
  }
);

export { router as getListingRouter };
