import { Listener, Subjects, UserAccountCreatedEvent } from '@jjmauction/common';
import { Message } from 'node-nats-streaming';
import { User } from '../../models';

import { queueGroupName } from './queue-group-name';

export class UserAccountCreatedListener extends Listener<UserAccountCreatedEvent> {
  queueGroupName = queueGroupName;
  subject: Subjects.UserAccountCreated = Subjects.UserAccountCreated;

  async onMessage(data: UserAccountCreatedEvent['data'], msg: Message) {
    const { userId, userName, userEmail } = data;

    console.log(`[SAGA] Creating user ${userId} (${userName}) with email ${userEmail} in listings service`);

    try {
      await User.create({ 
        id: userId, 
        name: userName,
        email: userEmail
      });

      console.log(`[SAGA] User ${userId} successfully created in listings service`);
    } catch (error: any) {
      // If user already exists, that's ok - just log and continue
      if (error.name === 'SequelizeUniqueConstraintError' || error.parent?.code === 'ER_DUP_ENTRY') {
        console.log(`[SAGA] User ${userId} already exists in listings service, skipping creation`);
      } else {
        console.error(`[SAGA] Failed to create user ${userId} in listings service:`, error);
        throw error;
      }
    }

    msg.ack();
  }
}
