import { Subjects } from './subjects';

// User Registration Saga State
export enum UserRegistrationSagaState {
  STARTED = 'STARTED',
  ACCOUNT_CREATED = 'ACCOUNT_CREATED',
  PROFILE_CREATED = 'PROFILE_CREATED',
  EMAIL_SENT = 'EMAIL_SENT',
  COMPLETED = 'COMPLETED',
  COMPENSATING = 'COMPENSATING',
  FAILED = 'FAILED'
}

// Saga Started Event
export interface UserRegistrationSagaStartedEvent {
  subject: Subjects.UserRegistrationSagaStarted;
  data: {
    sagaId: string;
    userId: string;
    userEmail: string;
    userName: string;
    userAvatar: string;
    timestamp: string;
  };
}

// Account Created Event
export interface UserAccountCreatedEvent {
  subject: Subjects.UserAccountCreated;
  data: {
    sagaId: string;
    userId: string;
    userEmail: string;
    userName: string;
    userAvatar: string;
    version: number;
    timestamp: string;
  };
}

// Profile Created Event
export interface ProfileCreatedEvent {
  subject: Subjects.ProfileCreated;
  data: {
    sagaId: string;
    userId: string;
    profileId: string;
    userEmail: string;
    userName: string;
    timestamp: string;
  };
}

// Welcome Email Sent Event
export interface WelcomeEmailSentEvent {
  subject: Subjects.WelcomeEmailSent;
  data: {
    sagaId: string;
    userId: string;
    email: string;
    timestamp: string;
  };
}

// Saga Completed Event
export interface UserRegistrationSagaCompletedEvent {
  subject: Subjects.UserRegistrationSagaCompleted;
  data: {
    sagaId: string;
    userId: string;
    completedSteps: string[];
    timestamp: string;
  };
}

// Saga Failed Event
export interface UserRegistrationSagaFailedEvent {
  subject: Subjects.UserRegistrationSagaFailed;
  data: {
    sagaId: string;
    userId?: string;
    failedStep: string;
    error: string;
    compensationRequired: boolean;
    timestamp: string;
  };
}

// Compensation Events
export interface UserAccountDeletedEvent {
  subject: Subjects.UserAccountDeleted;
  data: {
    sagaId: string;
    userId: string;
    timestamp: string;
  };
}

export interface ProfileDeletedEvent {
  subject: Subjects.ProfileDeleted;
  data: {
    sagaId: string;
    userId: string;
    timestamp: string;
  };
}
