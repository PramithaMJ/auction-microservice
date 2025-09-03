const { Listing, ListingRead, db } = require('./dist/models');
const { generateImageUrls } = require('./dist/utils/s3-config');

async function fixSpectacleListing() {
  try {
    await db.authenticate();
    
    // Find spectacle listing in main table
    const mainListing = await Listing.findOne({
      where: { title: 'spectacle' }
    });
    
    if (!mainListing) {
      console.log('Main listing not found');
      return;
    }
    
    console.log('Found main listing:', {
      id: mainListing.id,
      title: mainListing.title,
      imageId: mainListing.imageId
    });
    
    // Find corresponding read model entry
    const readListing = await ListingRead.findOne({
      where: { id: mainListing.id }
    });
    
    if (!readListing) {
      console.log('Read model entry not found');
      return;
    }
    
    // Update the read model with image data
    const updateData = {
      imageId: mainListing.imageId,
      description: mainListing.description
    };
    
    // Generate S3 URLs if bucket is configured
    const bucketName = process.env.AWS_S3_BUCKET_NAME;
    if (bucketName && mainListing.imageId) {
      try {
        const imageUrls = await generateImageUrls(mainListing.imageId, bucketName);
        updateData.smallImage = imageUrls.small;
        updateData.largeImage = imageUrls.large;
        updateData.imageUrl = imageUrls.large;
        console.log('Generated S3 URLs successfully');
      } catch (error) {
        console.error('Failed to generate S3 URLs:', error);
      }
    }
    
    await readListing.update(updateData);
    console.log('Successfully updated read model for spectacle listing');
    
    // Verify the update
    const updatedReadListing = await ListingRead.findOne({
      where: { id: mainListing.id }
    });
    
    console.log('Updated read model:', {
      id: updatedReadListing.id,
      title: updatedReadListing.title,
      imageId: updatedReadListing.imageId,
      hasSmallImage: !!updatedReadListing.smallImage,
      smallImageLength: updatedReadListing.smallImage?.length || 0
    });
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    process.exit(0);
  }
}

fixSpectacleListing();
