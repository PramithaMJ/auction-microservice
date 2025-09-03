import { Op } from 'sequelize';
import { Listing, ListingRead } from '../models';

export const populateMissingSlugs = async (): Promise<void> => {
  console.log('Checking for listings that need slug population...');
  
  try {
    // Find all listings in the main Listing table that have slugs
    const listings = await Listing.findAll({
      attributes: ['id', 'slug', 'title'],
      where: {
        slug: {
          [Op.ne]: null // Only get listings that have non-null slugs
        }
      }
    });
    
    console.log(`Found ${listings.length} listings with slugs in main table`);
    
    // Find read entries that don't have slugs yet
    const readEntriesWithoutSlugs = await ListingRead.findAll({
      where: {
        slug: {
          [Op.or]: [null, '']
        }
      }
    });
    
    console.log(`Found ${readEntriesWithoutSlugs.length} read entries without slugs`);
    
    // Update each read entry with its corresponding slug from the main table
    let updatedCount = 0;
    for (const readEntry of readEntriesWithoutSlugs) {
      try {
        const correspondingListing = listings.find(listing => listing.id === readEntry.id);
        if (correspondingListing && correspondingListing.slug) {
          await readEntry.update({
            slug: correspondingListing.slug
          });
          updatedCount++;
          console.log(`Updated slug for listing ID: ${readEntry.id} -> ${correspondingListing.slug}`);
        }
      } catch (error) {
        console.error(`Error updating slug for listing ${readEntry.id}:`, error);
      }
    }
    
    console.log(`Successfully updated ${updatedCount} listing read entries with slugs`);
    console.log('Slug population complete');
  } catch (error) {
    console.error('Error during slug population:', error);
  }
};