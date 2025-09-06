import { v4 as uuidv4 } from 'uuid';
import { BaseSagaOrchestrator, BidPlacementRequest } from './interfaces/base-saga-orchestrator';
import { enhancedSagaStateManager, SagaState } from './enhanced-saga-state-manager';
import { natsWrapper } from './nats-wrapper';
import { Subjects } from './common';

enum BidPlacementSagaState {
  STARTED = 'STARTED',
  BID_VALIDATED = 'BID_VALIDATED',
  FUNDS_RESERVED = 'FUNDS_RESERVED',
  BID_PLACED = 'BID_PLACED',
  AUCTION_UPDATED = 'AUCTION_UPDATED',
  NOTIFICATION_SENT = 'NOTIFICATION_SENT',
  COMPLETED = 'COMPLETED',
  COMPENSATING = 'COMPENSATING',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED'
}

interface BidValidatedEvent {
  sagaId: string;
  bidId: string;
  isValid: boolean;
  currentHighestBid?: number;
}

interface FundsReservedEvent {
  sagaId: string;
  bidId: string;
  userId: string;
  reservationId: string;
  amount: number;
}

interface BidPlacedEvent {
  sagaId: string;
  bidId: string;
  listingId: string;
  userId: string;
  bidAmount: number;
  timestamp: string;
}

interface AuctionUpdatedEvent {
  sagaId: string;
  listingId: string;
  newHighestBid: number;
  newHighestBidder: string;
}

export class BidPlacementSagaOrchestrator implements BaseSagaOrchestrator<BidPlacementRequest> {
  private readonly sagaType = 'bid-placement';

  constructor() {
    this.setupEventListeners();
  }

  async startSaga(request: BidPlacementRequest): Promise<string> {
    const sagaId = uuidv4();
    const timestamp = new Date().toISOString();

    console.log(` Starting Bid Placement Saga: ${sagaId} for listing: ${request.listingId}`);

    const initialState: SagaState = {
      sagaId,
      sagaType: this.sagaType,
      userId: request.userId,
      userEmail: request.userEmail,
      state: BidPlacementSagaState.STARTED,
      completedSteps: [],
      startedAt: timestamp,
      lastUpdatedAt: timestamp,
      priority: 'high', // Bid placement is time-sensitive
      metadata: {
        bidId: request.bidId,
        listingId: request.listingId,
        bidAmount: request.bidAmount
      }
    };

    try {
      await enhancedSagaStateManager.saveSagaState(initialState);

      // Start bid validation
      await this.publishBidValidationEvent(request, sagaId);

      return sagaId;
    } catch (error: any) {
      console.error(` Failed to start bid placement saga: ${error.message}`);
      await enhancedSagaStateManager.markSagaAsFailed(this.sagaType, sagaId, error.message);
      throw error;
    }
  }

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

    // Restart from the last failed step
    await this.resumeSagaFromLastStep(saga);
  }

  async cancelSaga(sagaId: string): Promise<void> {
    const saga = await this.getSagaStatus(sagaId);
    if (!saga) {
      throw new Error(`Saga ${sagaId} not found`);
    }

    if (saga.state === BidPlacementSagaState.COMPLETED) {
      throw new Error(`Cannot cancel completed saga ${sagaId}`);
    }

    // Start compensation
    await this.startCompensation(saga);
    await enhancedSagaStateManager.cancelSaga(this.sagaType, sagaId);
  }

  async handleTimeout(sagaId: string): Promise<void> {
    const saga = await this.getSagaStatus(sagaId);
    if (!saga) return;

    console.log(` Handling timeout for bid placement saga: ${sagaId}`);
    await this.startCompensation(saga);
    await enhancedSagaStateManager.markSagaAsFailed(this.sagaType, sagaId, 'Saga timeout');
  }

  private setupEventListeners(): void {
    // Bid validation completed
    natsWrapper.client.subscribe('bid-validated', 'bid-placement-saga-queue-group')
      .on('message', async (msg: any) => {
        const data: BidValidatedEvent = JSON.parse(msg.getData());
        await this.handleBidValidated(data);
        msg.ack();
      });

    // Funds reserved
    natsWrapper.client.subscribe('funds-reserved', 'bid-placement-saga-queue-group')
      .on('message', async (msg: any) => {
        const data: FundsReservedEvent = JSON.parse(msg.getData());
        await this.handleFundsReserved(data);
        msg.ack();
      });

    // Bid placed
    natsWrapper.client.subscribe('bid-placed', 'bid-placement-saga-queue-group')
      .on('message', async (msg: any) => {
        const data: BidPlacedEvent = JSON.parse(msg.getData());
        await this.handleBidPlaced(data);
        msg.ack();
      });

    // Auction updated
    natsWrapper.client.subscribe('auction-updated', 'bid-placement-saga-queue-group')
      .on('message', async (msg: any) => {
        const data: AuctionUpdatedEvent = JSON.parse(msg.getData());
        await this.handleAuctionUpdated(data);
        msg.ack();
      });
  }

  private async publishBidValidationEvent(request: BidPlacementRequest, sagaId: string): Promise<void> {
    const event = {
      sagaId,
      bidId: request.bidId,
      listingId: request.listingId,
      userId: request.userId,
      bidAmount: request.bidAmount,
      timestamp: new Date().toISOString()
    };

    await natsWrapper.client.publish('validate-bid', JSON.stringify(event));
    console.log(` Published bid validation event for saga: ${sagaId}`);
  }

  private async handleBidValidated(data: BidValidatedEvent): Promise<void> {
    const saga = await this.getSagaStatus(data.sagaId);
    if (!saga) return;

    if (data.isValid) {
      saga.state = BidPlacementSagaState.BID_VALIDATED;
      saga.completedSteps.push('BID_VALIDATED');
      await enhancedSagaStateManager.saveSagaState(saga);

      // Reserve funds
      await this.publishFundsReservationEvent(saga);
    } else {
      await this.handleSagaFailure(saga, 'Bid validation failed: Invalid bid amount');
    }
  }

  private async publishFundsReservationEvent(saga: SagaState): Promise<void> {
    const event = {
      sagaId: saga.sagaId,
      userId: saga.userId,
      bidId: saga.metadata?.bidId,
      amount: saga.metadata?.bidAmount,
      timestamp: new Date().toISOString()
    };

    await natsWrapper.client.publish('reserve-funds', JSON.stringify(event));
    console.log(` Published funds reservation event for saga: ${saga.sagaId}`);
  }

  private async handleFundsReserved(data: FundsReservedEvent): Promise<void> {
    const saga = await this.getSagaStatus(data.sagaId);
    if (!saga) return;

    saga.state = BidPlacementSagaState.FUNDS_RESERVED;
    saga.completedSteps.push('FUNDS_RESERVED');
    saga.metadata = { ...saga.metadata, reservationId: data.reservationId };
    await enhancedSagaStateManager.saveSagaState(saga);

    // Place the bid
    await this.publishBidPlacementEvent(saga);
  }

  private async publishBidPlacementEvent(saga: SagaState): Promise<void> {
    const event = {
      sagaId: saga.sagaId,
      bidId: saga.metadata?.bidId,
      listingId: saga.metadata?.listingId,
      userId: saga.userId,
      bidAmount: saga.metadata?.bidAmount,
      timestamp: new Date().toISOString()
    };

    await natsWrapper.client.publish('place-bid', JSON.stringify(event));
    console.log(` Published bid placement event for saga: ${saga.sagaId}`);
  }

  private async handleBidPlaced(data: BidPlacedEvent): Promise<void> {
    const saga = await this.getSagaStatus(data.sagaId);
    if (!saga) return;

    saga.state = BidPlacementSagaState.BID_PLACED;
    saga.completedSteps.push('BID_PLACED');
    await enhancedSagaStateManager.saveSagaState(saga);

    // Update auction state
    await this.publishAuctionUpdateEvent(saga);
  }

  private async publishAuctionUpdateEvent(saga: SagaState): Promise<void> {
    const event = {
      sagaId: saga.sagaId,
      listingId: saga.metadata?.listingId,
      newHighestBid: saga.metadata?.bidAmount,
      newHighestBidder: saga.userId,
      timestamp: new Date().toISOString()
    };

    await natsWrapper.client.publish('update-auction', JSON.stringify(event));
    console.log(` Published auction update event for saga: ${saga.sagaId}`);
  }

  private async handleAuctionUpdated(data: AuctionUpdatedEvent): Promise<void> {
    const saga = await this.getSagaStatus(data.sagaId);
    if (!saga) return;

    saga.state = BidPlacementSagaState.AUCTION_UPDATED;
    saga.completedSteps.push('AUCTION_UPDATED');
    await enhancedSagaStateManager.saveSagaState(saga);

    // Send notification and complete saga
    await this.publishNotificationEvent(saga);
    await this.completeSaga(saga);
  }

  private async publishNotificationEvent(saga: SagaState): Promise<void> {
    const event = {
      sagaId: saga.sagaId,
      userId: saga.userId,
      userEmail: saga.userEmail,
      type: 'BID_PLACED_SUCCESS',
      listingId: saga.metadata?.listingId,
      bidAmount: saga.metadata?.bidAmount,
      timestamp: new Date().toISOString()
    };

    await natsWrapper.client.publish('send-notification', JSON.stringify(event));
    console.log(` Published notification event for saga: ${saga.sagaId}`);
  }

  private async completeSaga(saga: SagaState): Promise<void> {
    saga.state = BidPlacementSagaState.COMPLETED;
    saga.completedSteps.push('COMPLETED');
    await enhancedSagaStateManager.markSagaAsCompleted(this.sagaType, saga.sagaId);

    console.log(` Bid placement saga completed: ${saga.sagaId}`);
  }

  private async handleSagaFailure(saga: SagaState, error: string): Promise<void> {
    console.log(` Bid placement saga failed: ${saga.sagaId} - ${error}`);
    await this.startCompensation(saga);
    await enhancedSagaStateManager.markSagaAsFailed(this.sagaType, saga.sagaId, error);
  }

  private async startCompensation(saga: SagaState): Promise<void> {
    saga.state = BidPlacementSagaState.COMPENSATING;
    saga.compensationRequired = true;
    await enhancedSagaStateManager.saveSagaState(saga);

    console.log(` Starting compensation for bid placement saga: ${saga.sagaId}`);

    // Reverse completed steps
    const completedSteps = [...saga.completedSteps].reverse();
    
    for (const step of completedSteps) {
      switch (step) {
        case 'FUNDS_RESERVED':
          await this.compensateReserveFunds(saga);
          break;
        case 'BID_PLACED':
          await this.compensateBidPlacement(saga);
          break;
        case 'AUCTION_UPDATED':
          await this.compensateAuctionUpdate(saga);
          break;
      }
    }
  }

  private async compensateReserveFunds(saga: SagaState): Promise<void> {
    const event = {
      sagaId: saga.sagaId,
      userId: saga.userId,
      reservationId: saga.metadata?.reservationId,
      amount: saga.metadata?.bidAmount,
      timestamp: new Date().toISOString()
    };

    await natsWrapper.client.publish('release-funds', JSON.stringify(event));
    console.log(` Published funds release compensation for saga: ${saga.sagaId}`);
  }

  private async compensateBidPlacement(saga: SagaState): Promise<void> {
    const event = {
      sagaId: saga.sagaId,
      bidId: saga.metadata?.bidId,
      listingId: saga.metadata?.listingId,
      timestamp: new Date().toISOString()
    };

    await natsWrapper.client.publish('remove-bid', JSON.stringify(event));
    console.log(` Published bid removal compensation for saga: ${saga.sagaId}`);
  }

  private async compensateAuctionUpdate(saga: SagaState): Promise<void> {
    const event = {
      sagaId: saga.sagaId,
      listingId: saga.metadata?.listingId,
      timestamp: new Date().toISOString()
    };

    await natsWrapper.client.publish('revert-auction-update', JSON.stringify(event));
    console.log(` Published auction revert compensation for saga: ${saga.sagaId}`);
  }

  private async resumeSagaFromLastStep(saga: SagaState): Promise<void> {
    console.log(` Resuming bid placement saga from last step: ${saga.sagaId}`);
    
    switch (saga.state) {
      case BidPlacementSagaState.STARTED:
        const request: BidPlacementRequest = {
          bidId: saga.metadata?.bidId,
          userId: saga.userId!,
          listingId: saga.metadata?.listingId,
          bidAmount: saga.metadata?.bidAmount,
          userEmail: saga.userEmail!
        };
        await this.publishBidValidationEvent(request, saga.sagaId);
        break;
      case BidPlacementSagaState.BID_VALIDATED:
        await this.publishFundsReservationEvent(saga);
        break;
      case BidPlacementSagaState.FUNDS_RESERVED:
        await this.publishBidPlacementEvent(saga);
        break;
      case BidPlacementSagaState.BID_PLACED:
        await this.publishAuctionUpdateEvent(saga);
        break;
      case BidPlacementSagaState.AUCTION_UPDATED:
        await this.publishNotificationEvent(saga);
        await this.completeSaga(saga);
        break;
    }
  }
}
