// Listener for ListingUpdatedEvent to update the CQRS read model
import { Listener, Subjects, ListingUpdatedEvent } from '@jjmauction/common';
import { Message } from 'node-nats-streaming';
import { ListingRead } from '../../models';
import { queueGroupName } from './queue-group-name';

export class ListingUpdatedListener extends Listener<ListingUpdatedEvent> {
  subject: Subjects.ListingUpdated = Subjects.ListingUpdated;
  queueGroupName = queueGroupName;

  async onMessage(data: ListingUpdatedEvent['data'], msg: Message) {
    // Update the read model entry
    await ListingRead.update(
      {
        title: data.title,
        description: data.description,
        currentPrice: data.currentPrice,
        endDate: data.expiresAt,
        imageUrl: data.imageUrl || '',
        imageId: data.imageId || '',
        smallImage: data.smallImage || '',
        largeImage: data.largeImage || '',
        status: data.status,
      },
      { where: { id: data.id } }
    );
    msg.ack();
  }
}
