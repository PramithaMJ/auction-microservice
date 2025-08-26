import { Subjects, UserAccountCreatedEvent } from '@jjmauction/common';
import { PublisherWithCircuitBreaker } from '../enhanced-publisher';

export class UserAccountCreatedPublisher extends PublisherWithCircuitBreaker<UserAccountCreatedEvent> {
  subject: Subjects.UserAccountCreated = Subjects.UserAccountCreated;
}
