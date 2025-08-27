import { WelcomeEmailSentEvent, Subjects } from '@jjmauction/common';
import { PublisherWithCircuitBreaker } from '../enhanced-publisher';

export class WelcomeEmailSentPublisher extends PublisherWithCircuitBreaker<WelcomeEmailSentEvent> {
  subject: Subjects.WelcomeEmailSent = Subjects.WelcomeEmailSent;
}
