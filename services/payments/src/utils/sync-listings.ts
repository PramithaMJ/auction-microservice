import axios from 'axios';
import { ListingStatus } from '@jjmauction/common';
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
  currentWinnerId?: string;
}

export const syncExistingListings = async (): Promise<void> => {
  const maxRetries = 3;
  const retryDelay = 5000; // 5 seconds
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(` [Payments] Syncing existing listings... (attempt ${attempt}/${maxRetries})`);

      const listingsServiceUrl = process.env.LISTINGS_SERVICE_URL || 'http://listings:3103';
      
      const response = await axios.get(`${listingsServiceUrl}/api/listings`, {
        timeout: 15000 // 15 seconds timeout
      });
      const listings: ListingData[] = response.data;

      console.log(` [Payments] Found ${listings.length} listings to sync`);

      for (const listingData of listings) {
        try {
          const existingListing = await Listing.findOne({
            where: { id: listingData.id },
          });

          if (!existingListing) {
            await Listing.create({
              id: listingData.id,
              status: listingData.status as ListingStatus,
              amount: listingData.currentPrice,
              winnerId: listingData.currentWinnerId || '',
            });
            console.log(` [Payments] Synced listing: ${listingData.title} (${listingData.id})`);
          } else {
            // Update existing listing
            await existingListing.update({
              status: listingData.status as ListingStatus,
              amount: listingData.currentPrice,
              winnerId: listingData.currentWinnerId || '',
            });
            console.log(` [Payments] Updated listing: ${listingData.title} (${listingData.id})`);
          }
        } catch (error) {
          console.error(` [Payments] Failed to sync listing ${listingData.id}:`, error);
        }
      }

      console.log(' [Payments] Listing sync complete!');
      return; // Success, exit the function
      
    } catch (error) {
      console.error(` [Payments] Failed to sync listings (attempt ${attempt}/${maxRetries}):`, error.message);
      
      if (attempt < maxRetries) {
        console.log(` [Payments] Retrying in ${retryDelay/1000} seconds...`);
        await new Promise(resolve => setTimeout(resolve, retryDelay));
      } else {
        console.error('💥 [Payments] All sync attempts failed. Service will continue without initial sync.');
      }
    }
  }
};
