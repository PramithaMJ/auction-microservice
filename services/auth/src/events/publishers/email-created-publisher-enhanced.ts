import { Subjects, EmailCreatedEvent } from '@jjmauction/common';
import { PublisherWithCircuitBreaker } from '../enhanced-publisher';

export class EmailCreatedPublisherEnhanced extends PublisherWithCircuitBreaker<EmailCreatedEvent> {
  subject: Subjects.EmailCreated = Subjects.EmailCreated;
}
