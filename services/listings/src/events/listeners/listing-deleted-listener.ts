// Listener for ListingDeletedEvent to update the CQRS read model
import { Listener, Subjects, ListingDeletedEvent } from '@jjmauction/common';
import { Message } from 'node-nats-streaming';
import { ListingRead } from '../../models';
import { queueGroupName } from './queue-group-name';

export class ListingDeletedListener extends Listener<ListingDeletedEvent> {
  subject: Subjects.ListingDeleted = Subjects.ListingDeleted;
  queueGroupName = queueGroupName;

  async onMessage(data: ListingDeletedEvent['data'], msg: Message) {
    // Remove the read model entry
    await ListingRead.destroy({ where: { id: data.id } });
    msg.ack();
  }
}
