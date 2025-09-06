import { v4 as uuidv4 } from 'uuid';
import { 
  UserRegistrationSagaState, 
  UserRegistrationSagaStartedEvent,
  UserAccountCreatedEvent,
  ProfileCreatedEvent,
  WelcomeEmailSentEvent,
  UserRegistrationSagaCompletedEvent,
  UserRegistrationSagaFailedEvent,
  UserAccountDeletedEvent,
  ProfileDeletedEvent,
  Subjects
} from './common';
import { natsWrapper } from './nats-wrapper';
import { enhancedSagaStateManager, SagaState } from './enhanced-saga-state-manager';
import { BaseSagaOrchestrator } from './interfaces/base-saga-orchestrator';

interface UserRegistrationRequest {
  userId: string;
  userEmail: string;
  userName: string;
  userAvatar: string;
}

export class UserRegistrationSagaOrchestrator implements BaseSagaOrchestrator<UserRegistrationRequest> {
  private readonly sagaType = 'user-registration';
  
  constructor() {
    this.setupEventListeners();
  }

  // Start the User Registration Saga
  async startSaga(request: UserRegistrationRequest): Promise<string> {
    const sagaId = uuidv4();
    const timestamp = new Date().toISOString();

    console.log(` Starting User Registration Saga: ${sagaId} for user: ${request.userEmail}`);

    // Initialize saga state
    const initialState: SagaState = {
      sagaId,
      sagaType: this.sagaType,
      userId: request.userId,
      userEmail: request.userEmail,
      userName: request.userName,
      userAvatar: request.userAvatar,
      state: UserRegistrationSagaState.STARTED,
      completedSteps: [],
      startedAt: timestamp,
      lastUpdatedAt: timestamp,
      priority: 'medium'
    };

    try {
      // Save initial state
      await enhancedSagaStateManager.saveSagaState(initialState);

      // Publish saga started event
      await this.publishSagaStartedEvent({
        sagaId,
        userId: request.userId,
        userEmail: request.userEmail,
        userName: request.userName,
        userAvatar: request.userAvatar,
        timestamp
      });

      console.log(` User Registration Saga ${sagaId} started successfully`);
      return sagaId;

    } catch (error: any) {
      console.error(` Failed to start User Registration Saga ${sagaId}:`, error);
      await enhancedSagaStateManager.markSagaAsFailed(this.sagaType, sagaId, error.message);
      throw error;
    }
  }

  // Interface implementation methods
  async getSagaStatus(sagaId: string): Promise<SagaState | null> {
    return await enhancedSagaStateManager.getSagaState(this.sagaType, sagaId);
  }

  async getAllActiveSagas(): Promise<SagaState[]> {
    const allSagas = await enhancedSagaStateManager.getAllActiveSagas();
    return allSagas.filter(saga => saga.sagaType === this.sagaType);
  }

  async retrySaga(sagaId: string): Promise<void> {
    const saga = await this.getSagaStatus(sagaId);
    if (!saga) {
      throw new Error(`Saga ${sagaId} not found`);
    }

    const canRetry = await enhancedSagaStateManager.incrementRetryCount(this.sagaType, sagaId);
    if (!canRetry) {
      throw new Error(`Saga ${sagaId} has exceeded maximum retry attempts`);
    }

    // Restart the saga based on current state
    await this.resumeSagaFromLastStep(saga);
  }

  async cancelSaga(sagaId: string): Promise<void> {
    const saga = await this.getSagaStatus(sagaId);
    if (!saga) {
      throw new Error(`Saga ${sagaId} not found`);
    }

    if (saga.state === UserRegistrationSagaState.COMPLETED) {
      throw new Error(`Cannot cancel completed saga ${sagaId}`);
    }

    // Start compensation
    await this.startCompensation(saga);
    await enhancedSagaStateManager.cancelSaga(this.sagaType, sagaId);
  }

  async handleTimeout(sagaId: string): Promise<void> {
    const saga = await this.getSagaStatus(sagaId);
    if (!saga) return;

    console.log(` Handling timeout for user registration saga: ${sagaId}`);
    await this.startCompensation(saga);
    await enhancedSagaStateManager.markSagaAsFailed(this.sagaType, sagaId, 'Saga timeout');
  }

  // Legacy method for backward compatibility
  async startUserRegistrationSaga(request: UserRegistrationRequest): Promise<string> {
    return await this.startSaga(request);
  }

  private setupEventListeners(): void {
    // Account created listener
    natsWrapper.client.subscribe(Subjects.UserAccountCreated, 'user-registration-saga-queue-group')
      .on('message', async (msg: any) => {
        const data: UserAccountCreatedEvent['data'] = JSON.parse(msg.getData());
        await this.handleAccountCreated(data);
        msg.ack();
      });

    // Profile created listener
    natsWrapper.client.subscribe(Subjects.ProfileCreated, 'user-registration-saga-queue-group')
      .on('message', async (msg: any) => {
        const data: ProfileCreatedEvent['data'] = JSON.parse(msg.getData());
        await this.handleProfileCreated(data);
        msg.ack();
      });

    // Welcome email sent listener
    natsWrapper.client.subscribe(Subjects.WelcomeEmailSent, 'user-registration-saga-queue-group')
      .on('message', async (msg: any) => {
        const data: WelcomeEmailSentEvent['data'] = JSON.parse(msg.getData());
        await this.handleWelcomeEmailSent(data);
        msg.ack();
      });

    // Account deleted listener (compensation)
    natsWrapper.client.subscribe(Subjects.UserAccountDeleted, 'user-registration-saga-queue-group')
      .on('message', async (msg: any) => {
        const data: UserAccountDeletedEvent['data'] = JSON.parse(msg.getData());
        await this.handleAccountDeleted(data);
        msg.ack();
      });

    // Profile deleted listener (compensation)
    natsWrapper.client.subscribe(Subjects.ProfileDeleted, 'user-registration-saga-queue-group')
      .on('message', async (msg: any) => {
        const data: ProfileDeletedEvent['data'] = JSON.parse(msg.getData());
        await this.handleProfileDeleted(data);
        msg.ack();
      });
  }

  // Handle Account Created Event
  async handleAccountCreated(event: UserAccountCreatedEvent['data']): Promise<void> {
    const { sagaId, userId, userEmail, userName, userAvatar, timestamp } = event;
    
    console.log(` Processing Account Created for saga: ${sagaId}`);

    try {
      const sagaState = await this.getSagaStatus(sagaId);
      if (!sagaState) {
        console.error(` Saga state not found for ${sagaId}`);
        return;
      }

      // Update saga state
      sagaState.state = UserRegistrationSagaState.ACCOUNT_CREATED;
      sagaState.userId = userId;
      sagaState.completedSteps.push('ACCOUNT_CREATED');
      await enhancedSagaStateManager.saveSagaState(sagaState);

      // Now trigger profile creation
      await this.triggerProfileCreation(sagaId, userId);

      console.log(` Account creation handled for saga: ${sagaId}`);

    } catch (error: any) {
      console.error(` Failed to handle account created for saga ${sagaId}:`, error);
      await this.handleSagaFailure(sagaId, 'Failed to handle account creation', error);
    }
  }

  // Handle Profile Created Event
  async handleProfileCreated(event: ProfileCreatedEvent['data']): Promise<void> {
    const { sagaId, userId, profileId, timestamp } = event;
    
    console.log(` Processing Profile Created for saga: ${sagaId}`);

    try {
      const sagaState = await this.getSagaStatus(sagaId);
      if (!sagaState) {
        console.error(` Saga state not found for ${sagaId}`);
        return;
      }

      // Update saga state
      sagaState.state = UserRegistrationSagaState.PROFILE_CREATED;
      sagaState.completedSteps.push('PROFILE_CREATED');
      await enhancedSagaStateManager.saveSagaState(sagaState);

      // Now trigger welcome email
      await this.triggerWelcomeEmail(sagaId, sagaState.userEmail || '', sagaState.userName || '');

      console.log(` Profile creation handled for saga: ${sagaId}`);

    } catch (error: any) {
      console.error(` Failed to handle profile created for saga ${sagaId}:`, error);
      await this.handleSagaFailure(sagaId, 'Failed to handle profile creation', error);
    }
  }

  // Handle Welcome Email Sent Event
  async handleWelcomeEmailSent(event: WelcomeEmailSentEvent['data']): Promise<void> {
    const { sagaId, userId, email, timestamp } = event;
    
    console.log(` Processing Welcome Email Sent for saga: ${sagaId}`);

    try {
      const sagaState = await this.getSagaStatus(sagaId);
      if (!sagaState) {
        console.error(` Saga state not found for ${sagaId}`);
        return;
      }

      // Update saga state
      sagaState.state = UserRegistrationSagaState.WELCOME_EMAIL_SENT;
      sagaState.completedSteps.push('WELCOME_EMAIL_SENT');
      await enhancedSagaStateManager.saveSagaState(sagaState);

      // Complete the saga
      await this.completeSaga(sagaId);

      console.log(` Welcome email handled for saga: ${sagaId}`);

    } catch (error: any) {
      console.error(` Failed to handle welcome email for saga ${sagaId}:`, error);
      await this.handleSagaFailure(sagaId, 'Failed to handle welcome email', error);
    }
  }

  // Handle Account Deleted Event (Compensation)
  private async handleAccountDeleted(event: UserAccountDeletedEvent['data']): Promise<void> {
    const { sagaId, userId, timestamp } = event;
    
    console.log(` Processing Account Deleted compensation for saga: ${sagaId}`);

    const sagaState = await this.getSagaStatus(sagaId);
    if (sagaState) {
      sagaState.state = UserRegistrationSagaState.COMPENSATION_ACCOUNT_DELETED;
      await enhancedSagaStateManager.saveSagaState(sagaState);
    }
  }

  // Handle Profile Deleted Event (Compensation)
  private async handleProfileDeleted(event: ProfileDeletedEvent['data']): Promise<void> {
    const { sagaId, userId, timestamp } = event;
    
    console.log(` Processing Profile Deleted compensation for saga: ${sagaId}`);

    const sagaState = await this.getSagaStatus(sagaId);
    if (sagaState) {
      sagaState.state = UserRegistrationSagaState.COMPENSATION_PROFILE_DELETED;
      await enhancedSagaStateManager.saveSagaState(sagaState);
    }
  }

  // Publish Saga Started Event
  private async publishSagaStartedEvent(data: UserRegistrationSagaStartedEvent['data']): Promise<void> {
    await natsWrapper.client.publish(
      Subjects.UserRegistrationSagaStarted,
      JSON.stringify(data)
    );
  }

  // Trigger Profile Creation
  private async triggerProfileCreation(sagaId: string, userId: string): Promise<void> {
    const sagaState = await this.getSagaStatus(sagaId);
    if (!sagaState) return;

    const profileData = {
      sagaId,
      userId,
      userEmail: sagaState.userEmail,
      userName: sagaState.userName,
      userAvatar: sagaState.userAvatar,
      timestamp: new Date().toISOString()
    };

    await natsWrapper.client.publish('profile:create', JSON.stringify(profileData));
    console.log(` Triggered profile creation for saga: ${sagaId}`);
  }

  // Trigger Welcome Email
  private async triggerWelcomeEmail(sagaId: string, userEmail: string, userName: string): Promise<void> {
    const emailData = {
      sagaId,
      userEmail,
      userName,
      emailType: 'WELCOME',
      timestamp: new Date().toISOString()
    };

    await natsWrapper.client.publish('email:send', JSON.stringify(emailData));
    console.log(` Triggered welcome email for saga: ${sagaId}`);
  }

  // Complete Saga
  private async completeSaga(sagaId: string): Promise<void> {
    const sagaState = await this.getSagaStatus(sagaId);
    if (!sagaState) return;

    sagaState.state = UserRegistrationSagaState.COMPLETED;
    sagaState.completedSteps.push('COMPLETED');
    await enhancedSagaStateManager.markSagaAsCompleted(this.sagaType, sagaId);

    // Publish completion event
    const completionData: UserRegistrationSagaCompletedEvent['data'] = {
      sagaId,
      userId: sagaState.userId || '',
      userEmail: sagaState.userEmail,
      userName: sagaState.userName,
      userAvatar: sagaState.userAvatar,
      completedSteps: sagaState.completedSteps,
      timestamp: new Date().toISOString()
    };

    await natsWrapper.client.publish(
      Subjects.UserRegistrationSagaCompleted,
      JSON.stringify(completionData)
    );

    console.log(` User Registration Saga completed: ${sagaId}`);
  }

  // Handle Saga Failure
  private async handleSagaFailure(sagaId: string, step: string, error: any): Promise<void> {
    console.log(` User Registration Saga failed: ${sagaId} at step: ${step}`);
    
    const saga = await this.getSagaStatus(sagaId);
    if (saga) {
      await this.startCompensation(saga);
    }
    
    await enhancedSagaStateManager.markSagaAsFailed(this.sagaType, sagaId, `${step}: ${error.message || error}`);

    // Publish failure event
    const failureData: UserRegistrationSagaFailedEvent['data'] = {
      sagaId,
      userId: saga?.userId,
      userEmail: saga?.userEmail,
      userName: saga?.userName,
      userAvatar: saga?.userAvatar,
      failedStep: step,
      error: error.message || error.toString(),
      compensationRequired: true,
      timestamp: new Date().toISOString()
    };

    await natsWrapper.client.publish(
      Subjects.UserRegistrationSagaFailed,
      JSON.stringify(failureData)
    );
  }

  // Start Compensation
  private async startCompensation(saga: SagaState): Promise<void> {
    saga.state = UserRegistrationSagaState.COMPENSATING;
    saga.compensationRequired = true;
    await enhancedSagaStateManager.saveSagaState(saga);

    console.log(` Starting compensation for user registration saga: ${saga.sagaId}`);

    // Reverse completed steps
    const completedSteps = [...saga.completedSteps].reverse();
    
    for (const step of completedSteps) {
      switch (step) {
        case 'PROFILE_CREATED':
          await this.compensateProfileCreation(saga);
          break;
        case 'ACCOUNT_CREATED':
          await this.compensateAccountCreation(saga);
          break;
      }
    }
  }

  // Compensate Profile Creation
  private async compensateProfileCreation(saga: SagaState): Promise<void> {
    const deleteProfileData = {
      sagaId: saga.sagaId,
      userId: saga.userId,
      timestamp: new Date().toISOString()
    };

    await natsWrapper.client.publish('profile:delete', JSON.stringify(deleteProfileData));
    console.log(` Published profile deletion compensation for saga: ${saga.sagaId}`);
  }

  // Compensate Account Creation
  private async compensateAccountCreation(saga: SagaState): Promise<void> {
    const deleteAccountData = {
      sagaId: saga.sagaId,
      userId: saga.userId,
      timestamp: new Date().toISOString()
    };

    await natsWrapper.client.publish('auth:delete-account', JSON.stringify(deleteAccountData));
    console.log(` Published account deletion compensation for saga: ${saga.sagaId}`);
  }

  // Resume Saga From Last Step
  private async resumeSagaFromLastStep(saga: SagaState): Promise<void> {
    console.log(` Resuming user registration saga from last step: ${saga.sagaId}`);
    
    switch (saga.state) {
      case UserRegistrationSagaState.STARTED:
        // Republish saga started event
        await this.publishSagaStartedEvent({
          sagaId: saga.sagaId,
          userId: saga.userId || '',
          userEmail: saga.userEmail || '',
          userName: saga.userName || '',
          userAvatar: saga.userAvatar || '',
          timestamp: new Date().toISOString()
        });
        break;
      case UserRegistrationSagaState.ACCOUNT_CREATED:
        await this.triggerProfileCreation(saga.sagaId, saga.userId || '');
        break;
      case UserRegistrationSagaState.PROFILE_CREATED:
        await this.triggerWelcomeEmail(saga.sagaId, saga.userEmail || '', saga.userName || '');
        break;
      case UserRegistrationSagaState.WELCOME_EMAIL_SENT:
        await this.completeSaga(saga.sagaId);
        break;
    }
  }
}
