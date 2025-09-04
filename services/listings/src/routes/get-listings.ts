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
    // Process listings in batches to avoid overwhelming the AWS SDK
    const batchSize = 10;
    const listingBatches = [];
    
    // Split listings into batches
    for (let i = 0; i < listings.length; i += batchSize) {
      listingBatches.push(listings.slice(i, i + batchSize));
    }
    
    console.log(`[get-listings] Processing ${listings.length} listings in ${listingBatches.length} batches of ${batchSize}`);
    
    // Process each batch sequentially for better reliability
    let refreshedListings = [];
    for (const batch of listingBatches) {
      const batchResults = await Promise.all(
        batch.map(async (listing) => {
          try {
            // Get the slug from the main listings table
            const mainListing = await Listing.findByPk(listing.id);
            const slug = mainListing ? mainListing.slug : listing.id;
            
            if (listing.imageId) {
              console.log(`[get-listings] Generating S3 URLs for listing ${listing.id}:`, listing.imageId);
              
              // Try twice with a retry mechanism
              let refreshedUrls;
              try {
                refreshedUrls = await generateImageUrls(listing.imageId, bucketName);
              } catch (urlError) {
                console.error(`[get-listings] First attempt failed for ${listing.id}:`, urlError);
                
                // Wait a moment and retry
                await new Promise(resolve => setTimeout(resolve, 100));
                try {
                  refreshedUrls = await generateImageUrls(listing.imageId, bucketName);
                } catch (retryError) {
                  console.error(`[get-listings] Retry also failed for ${listing.id}:`, retryError);
                  // Continue with existing URLs if available
                  return {
                    ...listing.toJSON(),
                    slug,
                    expiresAt: listing.endDate,
                  };
                }
              }
              
              console.log(`[get-listings] ✅ Generated URLs for ${listing.id}`);
              return {
                ...listing.toJSON(),
                slug, // Add slug from main table
                expiresAt: listing.endDate, // Map endDate to expiresAt for frontend compatibility
                smallImage: refreshedUrls.small,
                largeImage: refreshedUrls.large,
              };
            }
            
            console.log(`[get-listings] No imageId for listing ${listing.id}, returning without images`);
            return {
              ...listing.toJSON(),
              slug, // Add slug from main table
              expiresAt: listing.endDate, // Map endDate to expiresAt for frontend compatibility
            };
          } catch (error) {
            console.error('[get-listings] Error refreshing URLs for listing:', listing.id, error);
            return {
              ...listing.toJSON(),
              slug: listing.id, // Fallback to ID if slug not found
              expiresAt: listing.endDate, // Map endDate to expiresAt for frontend compatibility
            };
          }
        })
      );
      
      refreshedListings = [...refreshedListings, ...batchResults];
      
      // Add a small delay between batches to avoid overwhelming resources
      if (batch !== listingBatches[listingBatches.length - 1]) {
        await new Promise(resolve => setTimeout(resolve, 50));
      }
    }
    
    console.log('[get-listings] Final response being prepared for frontend:');
    console.log(`[get-listings] Total processed listings: ${refreshedListings.length}`);
    
    // Log a sample of the listings for debug
    const sampleSize = Math.min(5, refreshedListings.length);
    refreshedListings.slice(0, sampleSize).forEach((listing, index) => {
      console.log(`[get-listings] Sample listing ${index + 1}:`, {
        id: listing.id,
        title: listing.title,
        smallImage: listing.smallImage ? `${listing.smallImage.substring(0, 30)}...` : 'NO_IMAGE',
        smallImageLength: listing.smallImage?.length || 0,
        hasValidImage: !!(listing.smallImage && listing.smallImage.length > 10)
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
          expiresAt: listing.endDate, // Map endDate to expiresAt for frontend compatibility
        };
      } catch (error) {
        console.error('Error getting slug for listing:', listing.id, error);
        return {
          ...listing.toJSON(),
          slug: listing.id, // Fallback to ID if slug not found
          expiresAt: listing.endDate, // Map endDate to expiresAt for frontend compatibility
        };
      }
    })
  );
  
  res.status(200).send(listingsWithSlugs);
});

export { router as getListingsRouter };
