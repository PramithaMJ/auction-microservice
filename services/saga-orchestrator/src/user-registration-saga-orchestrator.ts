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
import { sagaStateManager, SagaState } from './saga-state-manager';

interface UserRegistrationRequest {
  userId: string;
  userEmail: string;
  userName: string;
  userAvatar: string;
}

export class UserRegistrationSagaOrchestrator {
  
  // Start the User Registration Saga
  async startUserRegistrationSaga(request: UserRegistrationRequest): Promise<string> {
    const sagaId = uuidv4();
    const timestamp = new Date().toISOString();

    console.log(` Starting User Registration Saga: ${sagaId} for user: ${request.userEmail}`);

    // Initialize saga state
    const initialState: SagaState = {
      sagaId,
      userId: request.userId,
      userEmail: request.userEmail,
      userName: request.userName,
      userAvatar: request.userAvatar,
      state: UserRegistrationSagaState.STARTED,
      completedSteps: [],
      startedAt: timestamp,
      lastUpdatedAt: timestamp
    };

    try {
      // Save initial state
      await sagaStateManager.saveSagaState(initialState);

      // Publish saga started event
      await this.publishSagaStartedEvent({
        sagaId,
        userId: request.userId,
        userEmail: request.userEmail,
        userName: request.userName,
        userAvatar: request.userAvatar,
        timestamp
      });

      console.log(`✅ User Registration Saga ${sagaId} started successfully`);
      return sagaId;

    } catch (error) {
      console.error(`❌ Failed to start User Registration Saga ${sagaId}:`, error);
      await this.handleSagaFailure(sagaId, 'SAGA_START', error, false);
      throw error;
    }
  }

  // Handle Account Created Event
  async handleAccountCreated(event: UserAccountCreatedEvent['data']): Promise<void> {
    const { sagaId, userId, userEmail, userName, userAvatar, version, timestamp } = event;
    
    console.log(`📋 Processing Account Created for saga: ${sagaId}`);

    try {
      const sagaState = await sagaStateManager.getSagaState(sagaId);
      if (!sagaState) {
        console.error(`❌ Saga state not found for ${sagaId}`);
        return;
      }

      // Update saga state
      sagaState.state = UserRegistrationSagaState.ACCOUNT_CREATED;
      sagaState.userId = userId;
      sagaState.completedSteps.push('ACCOUNT_CREATED');
      await sagaStateManager.saveSagaState(sagaState);

      // Now trigger profile creation
      await this.triggerProfileCreation(sagaId, userId);

      console.log(`✅ Account creation handled for saga: ${sagaId}`);

    } catch (error) {
      console.error(`❌ Failed to handle account created for saga ${sagaId}:`, error);
      await this.handleSagaFailure(sagaId, 'ACCOUNT_CREATED', error, true);
    }
  }

  // Handle Profile Created Event
  async handleProfileCreated(event: ProfileCreatedEvent['data']): Promise<void> {
    const { sagaId, userId, profileId, timestamp } = event;
    
    console.log(`📋 Processing Profile Created for saga: ${sagaId}`);

    try {
      const sagaState = await sagaStateManager.getSagaState(sagaId);
      if (!sagaState) {
        console.error(`❌ Saga state not found for ${sagaId}`);
        return;
      }

      // Update saga state
      sagaState.state = UserRegistrationSagaState.PROFILE_CREATED;
      sagaState.completedSteps.push('PROFILE_CREATED');
      await sagaStateManager.saveSagaState(sagaState);

      // Now trigger welcome email
      await this.triggerWelcomeEmail(sagaId, userId, sagaState.userEmail, sagaState.userName);

      console.log(`✅ Profile creation handled for saga: ${sagaId}`);

    } catch (error) {
      console.error(`❌ Failed to handle profile created for saga ${sagaId}:`, error);
      await this.handleSagaFailure(sagaId, 'PROFILE_CREATED', error, true);
    }
  }

  // Handle Welcome Email Sent Event
  async handleWelcomeEmailSent(event: WelcomeEmailSentEvent['data']): Promise<void> {
    const { sagaId, userId, email, timestamp } = event;
    
    console.log(`📋 Processing Welcome Email Sent for saga: ${sagaId}`);

    try {
      const sagaState = await sagaStateManager.getSagaState(sagaId);
      if (!sagaState) {
        console.error(`❌ Saga state not found for ${sagaId}`);
        return;
      }

      // Update saga state
      sagaState.state = UserRegistrationSagaState.EMAIL_SENT;
      sagaState.completedSteps.push('EMAIL_SENT');
      await sagaStateManager.saveSagaState(sagaState);

      // Complete the saga
      await this.completeSaga(sagaId, sagaState.completedSteps);

      console.log(`✅ Welcome email handled for saga: ${sagaId}`);

    } catch (error) {
      console.error(`❌ Failed to handle welcome email for saga ${sagaId}:`, error);
      await this.handleSagaFailure(sagaId, 'EMAIL_SENT', error, true);
    }
  }

  // Complete the saga
  private async completeSaga(sagaId: string, completedSteps: string[]): Promise<void> {
    try {
      const sagaState = await sagaStateManager.getSagaState(sagaId);
      if (!sagaState) {
        console.error(`❌ Saga state not found for ${sagaId}`);
        return;
      }

      // Update final state
      sagaState.state = UserRegistrationSagaState.COMPLETED;
      await sagaStateManager.saveSagaState(sagaState);

      // Publish completion event
      await this.publishSagaCompletedEvent({
        sagaId,
        userId: sagaState.userId!,
        completedSteps,
        timestamp: new Date().toISOString()
      });

      // Clean up saga state after successful completion
      setTimeout(async () => {
        await sagaStateManager.deleteSagaState(sagaId);
      }, 60000); // Delete after 1 minute

      console.log(`🎉 User Registration Saga ${sagaId} completed successfully`);

    } catch (error) {
      console.error(`❌ Failed to complete saga ${sagaId}:`, error);
      throw error;
    }
  }

  // Handle saga failure and trigger compensations
  private async handleSagaFailure(sagaId: string, failedStep: string, error: any, compensationRequired: boolean): Promise<void> {
    try {
      const sagaState = await sagaStateManager.getSagaState(sagaId);
      if (!sagaState) {
        console.error(`❌ Saga state not found for ${sagaId} during failure handling`);
        return;
      }

      // Update saga state to failed
      sagaState.state = UserRegistrationSagaState.FAILED;
      sagaState.error = error.message || 'Unknown error';
      sagaState.compensationRequired = compensationRequired;
      await sagaStateManager.saveSagaState(sagaState);

      // Publish failure event
      await this.publishSagaFailedEvent({
        sagaId,
        userId: sagaState.userId,
        failedStep,
        error: error.message || 'Unknown error',
        compensationRequired,
        timestamp: new Date().toISOString()
      });

      // Trigger compensations if required
      if (compensationRequired && sagaState.completedSteps.length > 0) {
        await this.triggerCompensations(sagaId, sagaState);
      }

      console.log(`💥 User Registration Saga ${sagaId} failed at step: ${failedStep}`);

    } catch (compensationError) {
      console.error(`❌ Failed to handle saga failure for ${sagaId}:`, compensationError);
    }
  }

  // Trigger compensation actions
  private async triggerCompensations(sagaId: string, sagaState: SagaState): Promise<void> {
    console.log(`🔄 Starting compensations for saga: ${sagaId}`);
    
    try {
      sagaState.state = UserRegistrationSagaState.COMPENSATING;
      await sagaStateManager.saveSagaState(sagaState);

      // Compensate in reverse order of completion
      const steps = [...sagaState.completedSteps].reverse();

      for (const step of steps) {
        switch (step) {
          case 'EMAIL_SENT':
            // Email compensation (usually just logging)
            console.log(`🔄 Compensating email for saga: ${sagaId}`);
            break;
            
          case 'PROFILE_CREATED':
            await this.compensateProfileCreation(sagaId, sagaState.userId!);
            break;
            
          case 'ACCOUNT_CREATED':
            await this.compensateAccountCreation(sagaId, sagaState.userId!);
            break;
        }
      }

      console.log(`✅ Compensations completed for saga: ${sagaId}`);

    } catch (error) {
      console.error(`❌ Failed to complete compensations for saga ${sagaId}:`, error);
    }
  }

  // Trigger profile creation
  private async triggerProfileCreation(sagaId: string, userId: string): Promise<void> {
    // This would normally send a command to the Profile Service
    // For now, we'll just log and assume it will happen via existing UserCreated event
    console.log(`🔄 Profile creation will be triggered by UserCreated event for saga: ${sagaId}`);
  }

  // Trigger welcome email
  private async triggerWelcomeEmail(sagaId: string, userId: string, email: string, userName: string): Promise<void> {
    // This would normally send a command to the Email Service
    // For now, we'll just log and assume it will happen via existing EmailCreated event
    console.log(`🔄 Welcome email will be triggered by EmailCreated event for saga: ${sagaId}`);
  }

  // Compensate profile creation
  private async compensateProfileCreation(sagaId: string, userId: string): Promise<void> {
    try {
      console.log(`🔄 Triggering profile deletion compensation for saga: ${sagaId}`);
      
      await natsWrapper.client.publish(
        Subjects.ProfileDeleted,
        JSON.stringify({
          sagaId,
          userId,
          timestamp: new Date().toISOString()
        })
      );

    } catch (error) {
      console.error(`❌ Failed to compensate profile creation for saga ${sagaId}:`, error);
    }
  }

  // Compensate account creation
  private async compensateAccountCreation(sagaId: string, userId: string): Promise<void> {
    try {
      console.log(`🔄 Triggering account deletion compensation for saga: ${sagaId}`);
      
      await natsWrapper.client.publish(
        Subjects.UserAccountDeleted,
        JSON.stringify({
          sagaId,
          userId,
          timestamp: new Date().toISOString()
        })
      );

    } catch (error) {
      console.error(`❌ Failed to compensate account creation for saga ${sagaId}:`, error);
    }
  }

  // Event publishers
  private async publishSagaStartedEvent(data: UserRegistrationSagaStartedEvent['data']): Promise<void> {
    return new Promise((resolve, reject) => {
      natsWrapper.client.publish(
        Subjects.UserRegistrationSagaStarted,
        JSON.stringify(data),
        (err) => {
          if (err) {
            reject(err);
          } else {
            console.log(`📤 Published UserRegistrationSagaStarted event for saga: ${data.sagaId}`);
            resolve();
          }
        }
      );
    });
  }

  private async publishSagaCompletedEvent(data: UserRegistrationSagaCompletedEvent['data']): Promise<void> {
    return new Promise((resolve, reject) => {
      natsWrapper.client.publish(
        Subjects.UserRegistrationSagaCompleted,
        JSON.stringify(data),
        (err) => {
          if (err) {
            reject(err);
          } else {
            console.log(`📤 Published UserRegistrationSagaCompleted event for saga: ${data.sagaId}`);
            resolve();
          }
        }
      );
    });
  }

  private async publishSagaFailedEvent(data: UserRegistrationSagaFailedEvent['data']): Promise<void> {
    return new Promise((resolve, reject) => {
      natsWrapper.client.publish(
        Subjects.UserRegistrationSagaFailed,
        JSON.stringify(data),
        (err) => {
          if (err) {
            reject(err);
          } else {
            console.log(`📤 Published UserRegistrationSagaFailed event for saga: ${data.sagaId}`);
            resolve();
          }
        }
      );
    });
  }

  // Get saga status
  async getSagaStatus(sagaId: string): Promise<SagaState | null> {
    return await sagaStateManager.getSagaState(sagaId);
  }

  // Get all active sagas
  async getAllActiveSagas(): Promise<SagaState[]> {
    return await sagaStateManager.getAllActiveSagas();
  }
}
