import { Subjects, UserCreatedEvent } from '@jjmauction/common';
import { PublisherWithCircuitBreaker } from '../enhanced-publisher';

export class UserCreatedPublisherEnhanced extends PublisherWithCircuitBreaker<UserCreatedEvent> {
  subject: Subjects.UserCreated = Subjects.UserCreated;
}
