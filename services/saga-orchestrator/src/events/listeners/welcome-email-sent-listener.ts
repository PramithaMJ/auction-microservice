import { Listener, WelcomeEmailSentEvent, Subjects } from '../../common';
import { Message } from 'node-nats-streaming';
import { UserRegistrationSagaOrchestrator } from '../../user-registration-saga-orchestrator';
import { queueGroupName } from './queue-group-name';

export class WelcomeEmailSentListener extends Listener<WelcomeEmailSentEvent> {
  subject: Subjects.WelcomeEmailSent = Subjects.WelcomeEmailSent;
  queueGroupName = queueGroupName;

  private sagaOrchestrator: UserRegistrationSagaOrchestrator;

  constructor(client: any, sagaOrchestrator: UserRegistrationSagaOrchestrator) {
    super(client);
    this.sagaOrchestrator = sagaOrchestrator;
  }

  async onMessage(data: WelcomeEmailSentEvent['data'], msg: Message) {
    console.log(`🎧 Received WelcomeEmailSent event for saga: ${data.sagaId}`);

    try {
      await this.sagaOrchestrator.handleWelcomeEmailSent(data);
      msg.ack();
    } catch (error) {
      console.error(' Failed to process WelcomeEmailSent event:', error);
      // Don't ack the message so it can be retried
    }
  }
}
