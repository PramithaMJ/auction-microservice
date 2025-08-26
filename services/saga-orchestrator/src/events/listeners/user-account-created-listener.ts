import { Listener, Subjects, UserAccountCreatedEvent } from '../../common';
import { Message } from 'node-nats-streaming';
import { UserRegistrationSagaOrchestrator } from '../../user-registration-saga-orchestrator';
import { queueGroupName } from './queue-group-name';

export class UserAccountCreatedListener extends Listener<UserAccountCreatedEvent> {
  subject: Subjects.UserAccountCreated = Subjects.UserAccountCreated;
  queueGroupName = queueGroupName;

  private sagaOrchestrator: UserRegistrationSagaOrchestrator;

  constructor(client: any, sagaOrchestrator: UserRegistrationSagaOrchestrator) {
    super(client);
    this.sagaOrchestrator = sagaOrchestrator;
  }

  async onMessage(data: UserAccountCreatedEvent['data'], msg: Message) {
    console.log(`🎧 Received UserAccountCreated event for saga: ${data.sagaId}`);

    try {
      await this.sagaOrchestrator.handleAccountCreated(data);
      msg.ack();
    } catch (error) {
      console.error('❌ Failed to process UserAccountCreated event:', error);
      // Don't ack the message so it can be retried
    }
  }
}
