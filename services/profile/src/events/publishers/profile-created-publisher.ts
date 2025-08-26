import { Subjects, ProfileCreatedEvent } from '@jjmauction/common';
import { PublisherWithCircuitBreaker } from '../enhanced-publisher';

export class ProfileCreatedPublisher extends PublisherWithCircuitBreaker<ProfileCreatedEvent> {
  subject: Subjects.ProfileCreated = Subjects.ProfileCreated;
}
