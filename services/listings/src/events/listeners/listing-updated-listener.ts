// Listener for ListingUpdatedEvent to update the CQRS read model
import { Listener, Subjects, ListingUpdatedEvent } from '@jjmauction/common';
import { Message } from 'node-nats-streaming';
import { ListingRead } from '../../models';
import { queueGroupName } from './queue-group-name';

export class ListingUpdatedListener extends Listener<ListingUpdatedEvent> {
  subject: Subjects.ListingUpdated = Subjects.ListingUpdated;
  queueGroupName = queueGroupName;

  async onMessage(data: ListingUpdatedEvent['data'], msg: Message) {
    // Update the read model entry with available data from the event
    try {
      await ListingRead.update(
        {
          currentPrice: data.currentPrice,
          status: data.status,
          // Only update fields that are available in the event
          // Other fields like title, description, etc. are not part of this event
        },
        { where: { id: data.id } }
      );
      
      console.log(`[listings-service] Updated read model for listing: ${data.id}`);
      msg.ack();
    } catch (error) {
      console.error(`[listings-service] Failed to update read model for listing ${data.id}:`, error);
      // Don't ack the message so it will be retried
    }
  }
}
