import { Listener, Subjects, UserAccountCreatedEvent } from '@jjmauction/common';
import { Message } from 'node-nats-streaming';
import { User } from '../../models';

import { queueGroupName } from './queue-group-name';

export class UserAccountCreatedListener extends Listener<UserAccountCreatedEvent> {
  queueGroupName = queueGroupName;
  subject: Subjects.UserAccountCreated = Subjects.UserAccountCreated;

  async onMessage(data: UserAccountCreatedEvent['data'], msg: Message) {
    const { userId, userName, userEmail, userAvatar, version } = data;

    console.log(`[SAGA] Creating user ${userId} (${userName}) with email ${userEmail} in bid service`);

    try {
      // Use upsert to create or update the user with real data
      // This will overwrite any placeholder data that might exist
      const [user, created] = await User.upsert({
        id: userId,
        name: userName,
        email: userEmail,
        avatar: userAvatar || '',
        version: version || 0
      });

      if (created) {
        console.log(`[SAGA] User ${userId} successfully created in bid service`);
      } else {
        console.log(`[SAGA] User ${userId} successfully updated with real data in bid service`);
      }
    } catch (error: any) {
      console.error(`[SAGA] Failed to create/update user ${userId} in bid service:`, error);
      throw error;
    }

    msg.ack();
  }
}
