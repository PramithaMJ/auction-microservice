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
  try {
    console.log(' Syncing existing listings from listings service...');

    const listingsServiceUrl =
      process.env.LISTINGS_SERVICE_URL || 'http://localhost:3103';
    const response = await axios.get(`${listingsServiceUrl}/api/listings`);
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
            `⏩ Listing already exists: ${listingData.title} (${listingData.id})`
          );
        }
      } catch (error) {
        console.error(` Failed to sync listing ${listingData.id}:`, error);
      }
    }

    console.log(' Listing sync complete!');
  } catch (error) {
    console.error(' Failed to sync listings:', error);
    // Don't throw error to prevent service from crashing
  }
};
