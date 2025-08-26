import { Listener, Subjects, UserAccountCreatedEvent } from '@jjmauction/common';
import { Message } from 'node-nats-streaming';
import { v4 as uuidv4 } from 'uuid';

import { Profile } from '../../models';
import { ProfileCreatedPublisher } from '../publishers/profile-created-publisher';
import { natsWrapper } from '../../nats-wrapper-circuit-breaker';
import { queueGroupName } from './queue-group-name';

export class UserAccountCreatedListener extends Listener<UserAccountCreatedEvent> {
  queueGroupName = queueGroupName;
  subject: Subjects.UserAccountCreated = Subjects.UserAccountCreated;

  async onMessage(data: UserAccountCreatedEvent['data'], msg: Message) {
    const { sagaId, userId, userEmail, userName } = data;

    console.log(`🎧 Profile Service received UserAccountCreated for saga: ${sagaId}`);

    try {
      // Create profile for the user
      const profile = await Profile.create({
        userId,
        firstName: '',
        lastName: '',
        country: '',
        about: '',
      });

      console.log(`✅ Profile created for user ${userId} in saga ${sagaId}`);

      // Publish ProfileCreated event for the saga
      try {
        await new ProfileCreatedPublisher(natsWrapper.client, natsWrapper).publish({
          sagaId,
          userId,
          profileId: profile.id!.toString(),
          userEmail,
          userName,
          timestamp: new Date().toISOString()
        }, { retries: 2 });

        console.log(`📤 Published ProfileCreated event for saga: ${sagaId}`);
      } catch (publishError) {
        console.error(`❌ Failed to publish ProfileCreated event for saga ${sagaId}:`, publishError);
        // Don't ack the message so it can be retried
        return;
      }

      msg.ack();
    } catch (error) {
      console.error(`❌ Failed to create profile for saga ${sagaId}:`, error);
      // Don't ack the message so it can be retried
    }
  }
}
