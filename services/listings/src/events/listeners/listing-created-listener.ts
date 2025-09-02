// Listener for ListingCreatedEvent to update the CQRS read model
import { Listener, Subjects, ListingCreatedEvent } from '@jjmauction/common';
import { Message } from 'node-nats-streaming';
import { ListingRead } from '../../models';
import { queueGroupName } from './queue-group-name';

export class ListingCreatedListener extends Listener<ListingCreatedEvent> {
  subject: Subjects.ListingCreated = Subjects.ListingCreated;
  queueGroupName = queueGroupName;

  async onMessage(data: ListingCreatedEvent['data'], msg: Message) {
    // Create a new read model entry with available data from the event
    // Some fields need to be populated from the actual listing data or set as defaults
    try {
      await ListingRead.create({
        id: data.id,
        title: data.title,
        description: '', // Not available in event, will be updated later
        currentPrice: data.price, // Use price as initial currentPrice
        endDate: data.expiresAt,
        imageUrl: '', // Not available in event, will be updated later
        imageId: '', // Not available in event, will be updated later
        smallImage: '', // Not available in event, will be updated later
        largeImage: '', // Not available in event, will be updated later
        sellerId: data.userId,
        sellerName: '', // Not available in event, will be updated later
        status: 'CREATED', // Default status, will be updated later
        slug: data.slug, // Add slug from event data
      });
      
      console.log(`[listings-service] Created read model for listing: ${data.id}`);
      msg.ack();
    } catch (error) {
      console.error(`[listings-service] Failed to create read model for listing ${data.id}:`, error);
      // Don't ack the message so it will be retried
    }
  }
}
