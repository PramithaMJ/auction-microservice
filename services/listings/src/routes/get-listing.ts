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
    let refreshedListing = listing.toJSON();
    
    if (bucketName && listing.imageId) {
      try {
        console.log(`[get-listing] Refreshing S3 URLs for listing ${listing.id} with imageId: ${listing.imageId}`);
        
        // Add retry mechanism for URL generation
        let retryCount = 0;
        const maxRetries = 2;
        let success = false;
        
        while (retryCount <= maxRetries && !success) {
          try {
            const refreshedUrls = await generateImageUrls(listing.imageId, bucketName);
            
            if (refreshedUrls.small && refreshedUrls.large) {
              const listingJson = listing.toJSON();
              
              // Add the properties from the model definition
              refreshedListing = {
                ...listingJson,
                smallImage: refreshedUrls.small,
                largeImage: refreshedUrls.large,
              };
              
              // Add imageUrl as a separate property not in the type definition
              (refreshedListing as any).imageUrl = refreshedUrls.large; // For backward compatibility
              
              console.log(`[get-listing]  Successfully refreshed URLs for listing ${listing.id}`);
              success = true;
            } else {
              throw new Error('Empty URLs returned');
            }
          } catch (err) {
            retryCount++;
            console.error(`[get-listing]  URL refresh attempt ${retryCount}/${maxRetries + 1} failed:`, err);
            
            if (retryCount <= maxRetries) {
              // Wait before next retry with exponential backoff
              const delay = 100 * Math.pow(2, retryCount);
              console.log(`[get-listing] Retrying in ${delay}ms...`);
              await new Promise(resolve => setTimeout(resolve, delay));
            }
          }
        }
      } catch (error) {
        console.error(`[get-listing]  Error refreshing URLs for listing ${listing.id}:`, error);
      }
    } else {
      console.log(`[get-listing] No imageId found for listing ${listing.id} or no S3 bucket configured`);
    }

    res.status(200).send(refreshedListing);
  }
);

export { router as getListingRouter };
