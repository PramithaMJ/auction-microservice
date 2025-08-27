// Saga Event Subjects for User Registration
export enum SagaSubjects {
  // User Registration Saga Events
  UserRegistrationSagaStarted = 'user-registration-saga:started',
  UserRegistrationSagaCompleted = 'user-registration-saga:completed',
  UserRegistrationSagaFailed = 'user-registration-saga:failed',
  
  // Step Events
  UserAccountCreated = 'user-registration-saga:account-created',
  ProfileCreated = 'user-registration-saga:profile-created',
  WelcomeEmailSent = 'user-registration-saga:welcome-email-sent',
  
  // Compensation Events
  UserAccountDeleted = 'user-registration-saga:account-deleted',
  ProfileDeleted = 'user-registration-saga:profile-deleted',
  EmailCompensated = 'user-registration-saga:email-compensated',
}
