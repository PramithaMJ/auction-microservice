// Listener for ListingCreatedEvent to update the CQRS read model
import { Listener, Subjects, ListingCreatedEvent } from '@jjmauction/common';
import { Message } from 'node-nats-streaming';
import { ListingRead, Listing, User } from '../../models';
import { queueGroupName } from './queue-group-name';
import { generateImageUrls } from '../../utils/s3-config';

export class ListingCreatedListener extends Listener<ListingCreatedEvent> {
  subject: Subjects.ListingCreated = Subjects.ListingCreated;
  queueGroupName = queueGroupName;

  async onMessage(data: ListingCreatedEvent['data'], msg: Message) {
    console.log(`[ListingCreatedListener] Processing event for listing ${data.id}`);
    console.log(`[ListingCreatedListener] Event data:`, {
      id: data.id,
      title: data.title,
      slug: data.slug,
      userId: data.userId,
      price: data.price
    });
    
    try {
      // Fetch the full listing data from main table to get image information
      const mainListing = await Listing.findByPk(data.id);
      
      if (!mainListing) {
        console.error(`[ListingCreatedListener] Main listing ${data.id} not found when creating read model`);
        // Create basic read model without image data
        await this.createBasicReadModel(data);
        return msg.ack();
      }
      
      console.log(`[ListingCreatedListener] Main listing found:`, {
        id: mainListing.id,
        title: mainListing.title,
        imageId: mainListing.imageId,
        hasImageId: !!mainListing.imageId
      });

      // Create read model with both event data and main table data
      const readModelData: any = {
        id: data.id,
        title: data.title,
        description: mainListing.description,
        currentPrice: data.price,
        endDate: data.expiresAt,
        imageId: mainListing.imageId || '',
        sellerId: data.userId,
        sellerName: '', // Will be populated below
        status: 'Active', // Use proper ListingStatus enum value instead of 'CREATED'
        slug: data.slug,
      };

      // Fetch seller information
      try {
        const seller = await User.findByPk(data.userId);
        if (seller) {
          readModelData.sellerName = seller.name;
          console.log(`[listings-service] Found seller: ${seller.name} for listing ${data.id}`);
        } else {
          console.log(`[listings-service] Seller ${data.userId} not found in database for listing ${data.id}`);
        }
      } catch (error) {
        console.error(`[listings-service] Failed to fetch seller ${data.userId} for listing ${data.id}:`, error);
      }

      // If listing has an image, generate S3 URLs
      if (mainListing.imageId) {
        const bucketName = process.env.AWS_S3_BUCKET_NAME;
        if (bucketName) {
          try {
            console.log(`[listings-service] Generating S3 URLs for new listing ${data.id} with imageId: ${mainListing.imageId}`);
            const imageUrls = await generateImageUrls(mainListing.imageId, bucketName);
            readModelData.smallImage = imageUrls.small;
            readModelData.largeImage = imageUrls.large;
            readModelData.imageUrl = imageUrls.large; // For backward compatibility
            console.log(`[listings-service] Generated image URLs for ${data.id}:`, {
              smallImageLength: imageUrls.small.length,
              largeImageLength: imageUrls.large.length
            });
          } catch (error) {
            console.error(`[listings-service] Failed to generate image URLs for ${mainListing.imageId}:`, error);
            // Still create read model without URLs
            readModelData.smallImage = '';
            readModelData.largeImage = '';
            readModelData.imageUrl = '';
          }
        } else {
          console.log(`[listings-service] No S3 bucket configured for listing ${data.id}`);
          readModelData.smallImage = '';
          readModelData.largeImage = '';
          readModelData.imageUrl = '';
        }
      } else {
        console.log(`[listings-service] No imageId found for listing ${data.id}`);
        readModelData.smallImage = '';
        readModelData.largeImage = '';
        readModelData.imageUrl = '';
      }

      await ListingRead.create(readModelData);
      console.log(`[ListingCreatedListener] ✅ Successfully created read model for listing: ${data.id} with slug: ${data.slug} and imageId: ${mainListing.imageId}`);
      console.log(`[ListingCreatedListener] Read model data:`, {
        id: readModelData.id,
        title: readModelData.title,
        smallImage: readModelData.smallImage ? `${readModelData.smallImage.substring(0, 50)}...` : 'NO_IMAGE',
        largeImage: readModelData.largeImage ? `${readModelData.largeImage.substring(0, 50)}...` : 'NO_IMAGE',
        hasSmallImage: !!readModelData.smallImage,
        hasLargeImage: !!readModelData.largeImage
      });
      msg.ack();
    } catch (error) {
      // Check if it's a duplicate entry error (which is okay since we create it immediately in the route)
      if (error.name === 'SequelizeUniqueConstraintError' || error.original?.code === 'ER_DUP_ENTRY') {
        console.log(`[ListingCreatedListener] Read model entry already exists for listing ${data.id} (created immediately in route)`);
        msg.ack();
        return;
      }
      
      console.error(`[ListingCreatedListener] ❌ Failed to create read model for listing ${data.id}:`, error);
      console.error(`[ListingCreatedListener] Error stack:`, error.stack);
      // Don't ack the message so it will be retried
    }
  }

  private async createBasicReadModel(data: ListingCreatedEvent['data']) {
    await ListingRead.create({
      id: data.id,
      title: data.title,
      description: '',
      currentPrice: data.price,
      endDate: data.expiresAt,
      imageUrl: '',
      imageId: '',
      smallImage: '',
      largeImage: '',
      sellerId: data.userId,
      sellerName: '',
      status: 'Active', // Use proper ListingStatus enum value instead of 'CREATED'
      slug: data.slug,
    });
  }
}
