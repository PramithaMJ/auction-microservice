import { Listener, Subjects, UserCreatedEvent } from '@jjmauction/common';
import { Message } from 'node-nats-streaming';
import { User } from '../../models';

import { queueGroupName } from './queue-group-name';

export class UserCreatedListener extends Listener<UserCreatedEvent> {
  queueGroupName = queueGroupName;
  subject: Subjects.UserCreated = Subjects.UserCreated;

  async onMessage(data: UserCreatedEvent['data'], msg: Message) {
    const { id, name, email } = data;

    try {
      await User.create({ id, name, email });
      console.log(`[listings-service] Created user: ${id} (${name})`);
      msg.ack();
    } catch (error) {
      console.error(`[listings-service] Failed to create user ${id}:`, error);
      // Don't ack the message so it will be retried
    }
  }
}
