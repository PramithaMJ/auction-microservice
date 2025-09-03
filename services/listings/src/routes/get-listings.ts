import express, { Request, Response } from 'express';
import { Sequelize } from 'sequelize';

import { Listing, ListingRead } from '../models';
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

  // Use the CQRS read model for queries
  const where: any = {};
  if (search && search.trim().length > 0) {
    where.title = { [require('sequelize').Op.like]: `%${search}%` };
  }
  const listings = await ListingRead.findAll({ where });

  console.log('listings found:', listings.length);

  // Debug the listings data
  listings.forEach((listing, index) => {
    console.log(`Listing ${index + 1} debug:`, {
      id: listing.id,
      title: listing.title,
      imageId: listing.imageId,
      hasImageId: !!listing.imageId
    });
  });

  // Refresh S3 URLs for each listing to ensure they haven't expired
  const bucketName = process.env.AWS_S3_BUCKET_NAME;
  console.log('S3 bucket configured:', !!bucketName);
  
  if (bucketName) {
    const refreshedListings = await Promise.all(
      listings.map(async (listing) => {
        try {
          // Get the slug from the main listings table
          const mainListing = await Listing.findByPk(listing.id);
          const slug = mainListing ? mainListing.slug : listing.id;
          
          if (listing.imageId) {
            console.log(`Generating S3 URLs for listing ${listing.id}:`, listing.imageId);
            const refreshedUrls = await generateImageUrls(listing.imageId, bucketName);
            console.log(`Generated URLs for ${listing.id}:`, refreshedUrls);
            return {
              ...listing.toJSON(),
              slug, // Add slug from main table
              smallImage: refreshedUrls.small,
              largeImage: refreshedUrls.large,
            };
          }
          console.log(`No imageId for listing ${listing.id}, returning without images`);
          return {
            ...listing.toJSON(),
            slug, // Add slug from main table
          };
        } catch (error) {
          console.error('Error refreshing URLs for listing:', listing.id, error);
          return {
            ...listing.toJSON(),
            slug: listing.id, // Fallback to ID if slug not found
          };
        }
      })
    );
    
    console.log('Final response being sent to frontend:');
    refreshedListings.forEach((listing, index) => {
      console.log(`Response listing ${index + 1}:`, {
        id: listing.id,
        title: listing.title,
        smallImage: listing.smallImage ? 'HAS_IMAGE' : 'NO_IMAGE',
        smallImageLength: listing.smallImage?.length || 0
      });
    });
    
    console.log('=== END DEBUG ===');
    return res.status(200).send(refreshedListings);
  }

  console.log('=== END DEBUG ===');
  
  // Add slugs to listings even without S3 refresh
  const listingsWithSlugs = await Promise.all(
    listings.map(async (listing) => {
      try {
        const mainListing = await Listing.findByPk(listing.id);
        const slug = mainListing ? mainListing.slug : listing.id;
        return {
          ...listing.toJSON(),
          slug,
        };
      } catch (error) {
        console.error('Error getting slug for listing:', listing.id, error);
        return {
          ...listing.toJSON(),
          slug: listing.id, // Fallback to ID if slug not found
        };
      }
    })
  );
  
  res.status(200).send(listingsWithSlugs);
});

export { router as getListingsRouter };
