import { ListingStatus } from '@jjmauction/common';
import axios from 'axios';

import { Listing } from '../models';

interface ListingData {
  id: string;
  userId: string;
  title: string;
  slug: string;
  startPrice: number;
  currentPrice: number;
  status: string;
  expiresAt: string;
}

export const syncExistingData = async (): Promise<void> => {
  const maxRetries = 5;
  const retryDelay = 3000; // 3 seconds
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(` Syncing existing listings from listings service... (attempt ${attempt}/${maxRetries})`);

      const listingsServiceUrl =
        process.env.LISTINGS_SERVICE_URL || 'http://listings:3103';
      
      // Add timeout to prevent hanging
      const response = await axios.get(`${listingsServiceUrl}/api/listings`, {
        timeout: 10000 // 10 seconds timeout
      });
      const listings: ListingData[] = response.data;

      console.log(` Found ${listings.length} listings to sync`);

      for (const listingData of listings) {
        try {
          const existingListing = await Listing.findOne({
            where: { id: listingData.id },
          });

          if (!existingListing) {
            await Listing.create({
              id: listingData.id,
              userId: listingData.userId,
              title: listingData.title,
              slug: listingData.slug,
              startPrice: listingData.startPrice,
              currentPrice: listingData.currentPrice,
              status: listingData.status as ListingStatus,
              expiresAt: new Date(listingData.expiresAt),
            });
            console.log(
              ` Synced listing: ${listingData.title} (${listingData.id})`
            );
          } else {
            console.log(
              ` Listing already exists: ${listingData.title} (${listingData.id})`
            );
        }
      } catch (error) {
        console.error(`❌ Failed to sync listing ${listingData.id}:`, error);
      }
    }

    console.log(' Listing sync complete!');
    return; // Success, exit the function
    
  } catch (error) {
    console.error(`❌ Failed to sync listings (attempt ${attempt}/${maxRetries}):`, error.message);
    
    if (attempt < maxRetries) {
      console.log(`⏰ Retrying in ${retryDelay/1000} seconds...`);
      await new Promise(resolve => setTimeout(resolve, retryDelay));
    } else {
      console.error('💥 All sync attempts failed. Service will continue without initial sync.');
      // Don't throw error to prevent service from crashing
    }
  }
}
};
