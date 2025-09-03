import { Listing, ListingRead } from '../models';
import { generateImageUrls } from './s3-config';

export async function syncImageDataToReadModel() {
  console.log(' Starting image data sync from main table to read model...');
  
  try {
    // Get all listings from main table that have imageId
    const mainListings = await Listing.findAll({
      where: {
        imageId: {
          [require('sequelize').Op.ne]: '',
          [require('sequelize').Op.not]: null
        }
      }
    });

    console.log(`Found ${mainListings.length} listings with image data in main table`);

    // Get all read model entries that have empty imageId
    const readEntries = await ListingRead.findAll({
      where: {
        imageId: {
          [require('sequelize').Op.or]: ['', null]
        }
      }
    });

    console.log(`Found ${readEntries.length} read model entries with missing image data`);

    let syncedCount = 0;
    const bucketName = process.env.AWS_S3_BUCKET_NAME;

    for (const mainListing of mainListings) {
      // Find corresponding read model entry
      const readEntry = readEntries.find(entry => entry.id === mainListing.id);
      
      if (readEntry) {
        console.log(`Syncing image data for listing ${mainListing.id}: ${mainListing.imageId}`);
        
        try {
          // Update read model with image data from main table
          const updateData: any = {
            imageId: mainListing.imageId,
            description: mainListing.description // Also sync description
          };

          // If S3 bucket is configured, generate fresh URLs
          if (bucketName && mainListing.imageId) {
            try {
              const imageUrls = await generateImageUrls(mainListing.imageId, bucketName);
              updateData.smallImage = imageUrls.small;
              updateData.largeImage = imageUrls.large;
              updateData.imageUrl = imageUrls.large; // For backward compatibility
            } catch (error) {
              console.error(`Failed to generate URLs for ${mainListing.imageId}:`, error);
              // Still update imageId even if URL generation fails
            }
          }

          await readEntry.update(updateData);
          syncedCount++;
          console.log(` Successfully synced listing ${mainListing.id}`);
        } catch (error) {
          console.error(` Failed to sync listing ${mainListing.id}:`, error);
        }
      }
    }

    console.log(` Image data sync complete! Updated ${syncedCount} read model entries`);
    return syncedCount;
  } catch (error) {
    console.error(' Image data sync failed:', error);
    throw error;
  }
}
