import express, { Request, Response } from 'express';
import { Sequelize } from 'sequelize';

import { Listing } from '../models';
import { generateImageUrls } from '../utils/s3-config';

const router = express.Router();

router.get('/api/listings/', async (req: Request, res: Response) => {
  const searchParam = req.query.search;
  const search = typeof searchParam === 'string' ? searchParam : '';

  console.log('=== GET LISTINGS DEBUG ===');
  console.log('req.query.search:', req.query.search);
  console.log('search variable:', search);
  console.log('search type:', typeof search);
  console.log('search length:', search.length);
  console.log('search falsy?:', !search);
  console.log('will use search?:', !!search);

  const listings =
    search && search.trim().length > 0
      ? await Listing.findAll({
          attributes: {
            include: [
              [
                Sequelize.literal(
                  `MATCH (title) AGAINST('${search}' IN NATURAL LANGUAGE MODE)`
                ),
                'score',
              ],
            ],
          },
          where: Sequelize.literal(
            `MATCH (title) AGAINST('${search}' IN NATURAL LANGUAGE MODE)`
          ),
          order: [[Sequelize.literal('score'), 'DESC']],
        })
      : await Listing.findAll();

  console.log('listings found:', listings.length);

  // Refresh S3 URLs for each listing to ensure they haven't expired
  const bucketName = process.env.AWS_S3_BUCKET_NAME;
  if (bucketName) {
    const refreshedListings = await Promise.all(
      listings.map(async (listing) => {
        try {
          if (listing.imageId) {
            const refreshedUrls = await generateImageUrls(listing.imageId, bucketName);
            return {
              ...listing.toJSON(),
              smallImage: refreshedUrls.small,
              largeImage: refreshedUrls.large,
            };
          }
          return listing.toJSON();
        } catch (error) {
          console.error('Error refreshing URLs for listing:', listing.id, error);
          return listing.toJSON();
        }
      })
    );
    
    console.log('=== END DEBUG ===');
    return res.status(200).send(refreshedListings);
  }

  console.log('=== END DEBUG ===');
  res.status(200).send(listings);
});

export { router as getListingsRouter };
