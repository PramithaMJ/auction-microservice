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
    // Create a new read model entry with available data from the event
    // Get additional data from the main listing table (like image data)
    try {
      // Fetch the full listing data from main table to get image information
      const mainListing = await Listing.findByPk(data.id);
      
      if (!mainListing) {
        console.error(`[listings-service] Main listing ${data.id} not found when creating read model`);
        // Create basic read model without image data
        await this.createBasicReadModel(data);
        return msg.ack();
      }

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
      console.log(`[listings-service] Created read model for listing: ${data.id} with slug: ${data.slug} and imageId: ${mainListing.imageId}`);
      msg.ack();
    } catch (error) {
      console.error(`[listings-service] Failed to create read model for listing ${data.id}:`, error);
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
