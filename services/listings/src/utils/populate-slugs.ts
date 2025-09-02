// Utility script to populate missing slugs in the read model from the main listings table
import { Listing, ListingRead } from '../models';

export async function populateMissingSlugs() {
  try {
    console.log('[PopulateSlugs] Starting slug population...');
    
    // Get all listings from read model that have null/missing slugs
    const readModelListings = await ListingRead.findAll({
      where: {
        slug: null
      }
    });
    
    console.log(`[PopulateSlugs] Found ${readModelListings.length} listings without slugs`);
    
    // For each listing, get the slug from the main listings table
    for (const readListing of readModelListings) {
      try {
        const mainListing = await Listing.findOne({
          where: { id: readListing.id }
        });
        
        if (mainListing && mainListing.slug) {
          await readListing.update({ slug: mainListing.slug });
          console.log(`[PopulateSlugs] Updated listing ${readListing.id} with slug: ${mainListing.slug}`);
        } else {
          console.log(`[PopulateSlugs] No main listing or slug found for: ${readListing.id}`);
        }
      } catch (error) {
        console.error(`[PopulateSlugs] Error updating listing ${readListing.id}:`, error);
      }
    }
    
    console.log('[PopulateSlugs] Slug population completed');
  } catch (error) {
    console.error('[PopulateSlugs] Error during slug population:', error);
  }
}
