// Listener for ListingCreatedEvent to update the CQRS read model
import { Listener, Subjects, ListingCreatedEvent } from '@jjmauction/common';
import { Message } from 'node-nats-streaming';
import { ListingRead } from '../../models';
import { queueGroupName } from './queue-group-name';

export class ListingCreatedListener extends Listener<ListingCreatedEvent> {
  subject: Subjects.ListingCreated = Subjects.ListingCreated;
  queueGroupName = queueGroupName;

  async onMessage(data: ListingCreatedEvent['data'], msg: Message) {
    // Create a new read model entry
    await ListingRead.create({
      id: data.id,
      title: data.title,
      description: data.description,
      currentPrice: data.currentPrice,
      endDate: data.expiresAt,
      imageUrl: data.imageUrl || '',
      sellerId: data.userId,
      sellerName: data.sellerName || '',
      status: data.status,
    });
    msg.ack();
  }
}
