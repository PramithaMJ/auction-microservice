export enum Subjects {
  ListingCreated = 'listing:created',
  ListingDeleted = 'listing:deleted',
  ListingExpired = 'listing:expired',
  ListingUpdated = 'listing:updated',

  BidCreated = 'bid:created',
  BidDeleted = 'bid:deleted',

  UserCreated = 'user:created',

  PaymentCreated = 'payment:created',

  EmailCreated = 'email:created',
  
  // Password Reset
  PasswordResetRequested = 'password:reset-requested',
  PasswordResetCompleted = 'password:reset-completed',
  
  // Saga Subjects
  UserRegistrationSagaStarted = 'user-registration-saga:started',
  UserRegistrationSagaCompleted = 'user-registration-saga:completed',
  UserRegistrationSagaFailed = 'user-registration-saga:failed',
  UserAccountCreated = 'user-registration-saga:account-created',
  ProfileCreated = 'user-registration-saga:profile-created',
  WelcomeEmailSent = 'user-registration-saga:welcome-email-sent',
  UserAccountDeleted = 'user-registration-saga:account-deleted',
  ProfileDeleted = 'user-registration-saga:profile-deleted',
}
