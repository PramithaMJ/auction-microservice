import { Subjects } from './subjects';

export interface PasswordResetRequestedEvent {
  subject: Subjects.PasswordResetRequested;
  data: {
    userId: string;
    email: string;
    name: string;
    token: string;
    expires: string;
  };
}

export interface PasswordResetCompletedEvent {
  subject: Subjects.PasswordResetCompleted;
  data: {
    userId: string;
    email: string;
    name: string;
  };
}
