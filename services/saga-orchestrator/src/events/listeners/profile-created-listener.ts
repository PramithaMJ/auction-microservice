import { Listener, Subjects, ProfileCreatedEvent } from '../../common';
import { Message } from 'node-nats-streaming';
import { UserRegistrationSagaOrchestrator } from '../../user-registration-saga-orchestrator';
import { queueGroupName } from './queue-group-name';

export class ProfileCreatedListener extends Listener<ProfileCreatedEvent> {
  subject: Subjects.ProfileCreated = Subjects.ProfileCreated;
  queueGroupName = queueGroupName;

  private sagaOrchestrator: UserRegistrationSagaOrchestrator;

  constructor(client: any, sagaOrchestrator: UserRegistrationSagaOrchestrator) {
    super(client);
    this.sagaOrchestrator = sagaOrchestrator;
  }

  async onMessage(data: ProfileCreatedEvent['data'], msg: Message) {
    console.log(` Received ProfileCreated event for saga: ${data.sagaId}`);

    try {
      await this.sagaOrchestrator.handleProfileCreated(data);
      msg.ack();
    } catch (error) {
      console.error(' Failed to process ProfileCreated event:', error);
      // Don't ack the message so it can be retried
    }
  }
}
