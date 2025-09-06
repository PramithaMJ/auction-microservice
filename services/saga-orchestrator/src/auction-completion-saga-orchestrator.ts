import { v4 as uuidv4 } from 'uuid';
import { BaseSagaOrchestrator, AuctionCompletionRequest } from './interfaces/base-saga-orchestrator';
import { enhancedSagaStateManager, SagaState } from './enhanced-saga-state-manager';
import { natsWrapper } from './nats-wrapper';

enum AuctionCompletionSagaState {
  STARTED = 'STARTED',
  AUCTION_FINALIZED = 'AUCTION_FINALIZED',
  PAYMENT_INITIATED = 'PAYMENT_INITIATED',
  PAYMENT_PROCESSED = 'PAYMENT_PROCESSED',
  ITEM_TRANSFERRED = 'ITEM_TRANSFERRED',
  SELLER_PAID = 'SELLER_PAID',
  NOTIFICATIONS_SENT = 'NOTIFICATIONS_SENT',
  COMPLETED = 'COMPLETED',
  COMPENSATING = 'COMPENSATING',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED'
}

interface AuctionFinalizedEvent {
  sagaId: string;
  listingId: string;
  winnerId?: string;
  winningBid?: number;
  hasWinner: boolean;
}

interface PaymentInitiatedEvent {
  sagaId: string;
  paymentId: string;
  listingId: string;
  winnerId: string;
  amount: number;
}

interface PaymentProcessedEvent {
  sagaId: string;
  paymentId: string;
  status: 'SUCCESS' | 'FAILED';
  transactionId?: string;
}

interface ItemTransferredEvent {
  sagaId: string;
  listingId: string;
  winnerId: string;
  transferId: string;
}

interface SellerPaidEvent {
  sagaId: string;
  sellerId: string;
  amount: number;
  paymentId: string;
}

export class AuctionCompletionSagaOrchestrator implements BaseSagaOrchestrator<AuctionCompletionRequest> {
  private readonly sagaType = 'auction-completion';

  constructor() {
    this.setupEventListeners();
  }

  async startSaga(request: AuctionCompletionRequest): Promise<string> {
    const sagaId = uuidv4();
    const timestamp = new Date().toISOString();

    console.log(` Starting Auction Completion Saga: ${sagaId} for listing: ${request.listingId}`);

    const initialState: SagaState = {
      sagaId,
      sagaType: this.sagaType,
      state: AuctionCompletionSagaState.STARTED,
      completedSteps: [],
      startedAt: timestamp,
      lastUpdatedAt: timestamp,
      priority: 'critical', // Auction completion is critical
      metadata: {
        listingId: request.listingId,
        winnerId: request.winnerId,
        winningBid: request.winningBid,
        sellerId: request.sellerId
      }
    };

    try {
      await enhancedSagaStateManager.saveSagaState(initialState);

      // Start auction finalization
      await this.publishAuctionFinalizationEvent(request, sagaId);

      return sagaId;
    } catch (error: any) {
      console.error(` Failed to start auction completion saga: ${error.message}`);
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

    await this.resumeSagaFromLastStep(saga);
  }

  async cancelSaga(sagaId: string): Promise<void> {
    const saga = await this.getSagaStatus(sagaId);
    if (!saga) {
      throw new Error(`Saga ${sagaId} not found`);
    }

    if (saga.state === AuctionCompletionSagaState.COMPLETED) {
      throw new Error(`Cannot cancel completed saga ${sagaId}`);
    }

    await this.startCompensation(saga);
    await enhancedSagaStateManager.cancelSaga(this.sagaType, sagaId);
  }

  async handleTimeout(sagaId: string): Promise<void> {
    const saga = await this.getSagaStatus(sagaId);
    if (!saga) return;

    console.log(` Handling timeout for auction completion saga: ${sagaId}`);
    await this.startCompensation(saga);
    await enhancedSagaStateManager.markSagaAsFailed(this.sagaType, sagaId, 'Saga timeout');
  }

  private setupEventListeners(): void {
    // Auction finalized
    natsWrapper.client.subscribe('auction-finalized', 'auction-completion-saga-queue-group')
      .on('message', async (msg: any) => {
        const data: AuctionFinalizedEvent = JSON.parse(msg.getData());
        await this.handleAuctionFinalized(data);
        msg.ack();
      });

    // Payment initiated
    natsWrapper.client.subscribe('payment-initiated', 'auction-completion-saga-queue-group')
      .on('message', async (msg: any) => {
        const data: PaymentInitiatedEvent = JSON.parse(msg.getData());
        await this.handlePaymentInitiated(data);
        msg.ack();
      });

    // Payment processed
    natsWrapper.client.subscribe('payment-processed', 'auction-completion-saga-queue-group')
      .on('message', async (msg: any) => {
        const data: PaymentProcessedEvent = JSON.parse(msg.getData());
        await this.handlePaymentProcessed(data);
        msg.ack();
      });

    // Item transferred
    natsWrapper.client.subscribe('item-transferred', 'auction-completion-saga-queue-group')
      .on('message', async (msg: any) => {
        const data: ItemTransferredEvent = JSON.parse(msg.getData());
        await this.handleItemTransferred(data);
        msg.ack();
      });

    // Seller paid
    natsWrapper.client.subscribe('seller-paid', 'auction-completion-saga-queue-group')
      .on('message', async (msg: any) => {
        const data: SellerPaidEvent = JSON.parse(msg.getData());
        await this.handleSellerPaid(data);
        msg.ack();
      });
  }

  private async publishAuctionFinalizationEvent(request: AuctionCompletionRequest, sagaId: string): Promise<void> {
    const event = {
      sagaId,
      listingId: request.listingId,
      winnerId: request.winnerId,
      winningBid: request.winningBid,
      sellerId: request.sellerId,
      timestamp: new Date().toISOString()
    };

    await natsWrapper.client.publish('finalize-auction', JSON.stringify(event));
    console.log(` Published auction finalization event for saga: ${sagaId}`);
  }

  private async handleAuctionFinalized(data: AuctionFinalizedEvent): Promise<void> {
    const saga = await this.getSagaStatus(data.sagaId);
    if (!saga) return;

    saga.state = AuctionCompletionSagaState.AUCTION_FINALIZED;
    saga.completedSteps.push('AUCTION_FINALIZED');
    await enhancedSagaStateManager.saveSagaState(saga);

    if (data.hasWinner && data.winnerId) {
      // Initiate payment process
      await this.publishPaymentInitiationEvent(saga, data.winnerId, data.winningBid!);
    } else {
      // No winner - send notifications and complete
      await this.publishNoWinnerNotificationEvent(saga);
      await this.completeSaga(saga);
    }
  }

  private async publishPaymentInitiationEvent(saga: SagaState, winnerId: string, amount: number): Promise<void> {
    const paymentId = uuidv4();
    
    const event = {
      sagaId: saga.sagaId,
      paymentId,
      listingId: saga.metadata?.listingId,
      winnerId,
      sellerId: saga.metadata?.sellerId,
      amount,
      timestamp: new Date().toISOString()
    };

    saga.metadata = { ...saga.metadata, paymentId, winnerId, winningBid: amount };
    await enhancedSagaStateManager.saveSagaState(saga);

    await natsWrapper.client.publish('initiate-payment', JSON.stringify(event));
    console.log(` Published payment initiation event for saga: ${saga.sagaId}`);
  }

  private async handlePaymentInitiated(data: PaymentInitiatedEvent): Promise<void> {
    const saga = await this.getSagaStatus(data.sagaId);
    if (!saga) return;

    saga.state = AuctionCompletionSagaState.PAYMENT_INITIATED;
    saga.completedSteps.push('PAYMENT_INITIATED');
    await enhancedSagaStateManager.saveSagaState(saga);

    console.log(` Payment initiated for saga: ${saga.sagaId}`);
  }

  private async handlePaymentProcessed(data: PaymentProcessedEvent): Promise<void> {
    const saga = await this.getSagaStatus(data.sagaId);
    if (!saga) return;

    if (data.status === 'SUCCESS') {
      saga.state = AuctionCompletionSagaState.PAYMENT_PROCESSED;
      saga.completedSteps.push('PAYMENT_PROCESSED');
      saga.metadata = { ...saga.metadata, transactionId: data.transactionId };
      await enhancedSagaStateManager.saveSagaState(saga);

      // Transfer item ownership
      await this.publishItemTransferEvent(saga);
    } else {
      await this.handleSagaFailure(saga, 'Payment processing failed');
    }
  }

  private async publishItemTransferEvent(saga: SagaState): Promise<void> {
    const event = {
      sagaId: saga.sagaId,
      listingId: saga.metadata?.listingId,
      winnerId: saga.metadata?.winnerId,
      sellerId: saga.metadata?.sellerId,
      timestamp: new Date().toISOString()
    };

    await natsWrapper.client.publish('transfer-item', JSON.stringify(event));
    console.log(` Published item transfer event for saga: ${saga.sagaId}`);
  }

  private async handleItemTransferred(data: ItemTransferredEvent): Promise<void> {
    const saga = await this.getSagaStatus(data.sagaId);
    if (!saga) return;

    saga.state = AuctionCompletionSagaState.ITEM_TRANSFERRED;
    saga.completedSteps.push('ITEM_TRANSFERRED');
    saga.metadata = { ...saga.metadata, transferId: data.transferId };
    await enhancedSagaStateManager.saveSagaState(saga);

    // Pay the seller
    await this.publishSellerPaymentEvent(saga);
  }

  private async publishSellerPaymentEvent(saga: SagaState): Promise<void> {
    // Calculate seller amount (minus platform fees)
    const winningBid = saga.metadata?.winningBid || 0;
    const platformFeePercentage = 0.05; // 5% platform fee
    const sellerAmount = winningBid * (1 - platformFeePercentage);

    const event = {
      sagaId: saga.sagaId,
      sellerId: saga.metadata?.sellerId,
      amount: sellerAmount,
      paymentId: saga.metadata?.paymentId,
      transactionId: saga.metadata?.transactionId,
      timestamp: new Date().toISOString()
    };

    await natsWrapper.client.publish('pay-seller', JSON.stringify(event));
    console.log(` Published seller payment event for saga: ${saga.sagaId}`);
  }

  private async handleSellerPaid(data: SellerPaidEvent): Promise<void> {
    const saga = await this.getSagaStatus(data.sagaId);
    if (!saga) return;

    saga.state = AuctionCompletionSagaState.SELLER_PAID;
    saga.completedSteps.push('SELLER_PAID');
    await enhancedSagaStateManager.saveSagaState(saga);

    // Send completion notifications
    await this.publishCompletionNotificationsEvent(saga);
    await this.completeSaga(saga);
  }

  private async publishCompletionNotificationsEvent(saga: SagaState): Promise<void> {
    const events = [
      // Winner notification
      {
        sagaId: saga.sagaId,
        userId: saga.metadata?.winnerId,
        type: 'AUCTION_WON',
        listingId: saga.metadata?.listingId,
        amount: saga.metadata?.winningBid,
        timestamp: new Date().toISOString()
      },
      // Seller notification
      {
        sagaId: saga.sagaId,
        userId: saga.metadata?.sellerId,
        type: 'AUCTION_COMPLETED',
        listingId: saga.metadata?.listingId,
        amount: saga.metadata?.winningBid,
        timestamp: new Date().toISOString()
      }
    ];

    for (const event of events) {
      await natsWrapper.client.publish('send-notification', JSON.stringify(event));
    }

    console.log(` Published completion notifications for saga: ${saga.sagaId}`);
  }

  private async publishNoWinnerNotificationEvent(saga: SagaState): Promise<void> {
    const event = {
      sagaId: saga.sagaId,
      userId: saga.metadata?.sellerId,
      type: 'AUCTION_NO_WINNER',
      listingId: saga.metadata?.listingId,
      timestamp: new Date().toISOString()
    };

    await natsWrapper.client.publish('send-notification', JSON.stringify(event));
    console.log(` Published no winner notification for saga: ${saga.sagaId}`);
  }

  private async completeSaga(saga: SagaState): Promise<void> {
    saga.state = AuctionCompletionSagaState.COMPLETED;
    saga.completedSteps.push('COMPLETED');
    await enhancedSagaStateManager.markSagaAsCompleted(this.sagaType, saga.sagaId);

    console.log(` Auction completion saga completed: ${saga.sagaId}`);
  }

  private async handleSagaFailure(saga: SagaState, error: string): Promise<void> {
    console.log(` Auction completion saga failed: ${saga.sagaId} - ${error}`);
    await this.startCompensation(saga);
    await enhancedSagaStateManager.markSagaAsFailed(this.sagaType, saga.sagaId, error);
  }

  private async startCompensation(saga: SagaState): Promise<void> {
    saga.state = AuctionCompletionSagaState.COMPENSATING;
    saga.compensationRequired = true;
    await enhancedSagaStateManager.saveSagaState(saga);

    console.log(` Starting compensation for auction completion saga: ${saga.sagaId}`);

    const completedSteps = [...saga.completedSteps].reverse();
    
    for (const step of completedSteps) {
      switch (step) {
        case 'PAYMENT_PROCESSED':
          await this.compensatePayment(saga);
          break;
        case 'ITEM_TRANSFERRED':
          await this.compensateItemTransfer(saga);
          break;
        case 'SELLER_PAID':
          await this.compensateSellerPayment(saga);
          break;
      }
    }
  }

  private async compensatePayment(saga: SagaState): Promise<void> {
    const event = {
      sagaId: saga.sagaId,
      paymentId: saga.metadata?.paymentId,
      transactionId: saga.metadata?.transactionId,
      timestamp: new Date().toISOString()
    };

    await natsWrapper.client.publish('refund-payment', JSON.stringify(event));
    console.log(` Published payment refund compensation for saga: ${saga.sagaId}`);
  }

  private async compensateItemTransfer(saga: SagaState): Promise<void> {
    const event = {
      sagaId: saga.sagaId,
      listingId: saga.metadata?.listingId,
      transferId: saga.metadata?.transferId,
      timestamp: new Date().toISOString()
    };

    await natsWrapper.client.publish('revert-item-transfer', JSON.stringify(event));
    console.log(` Published item transfer revert compensation for saga: ${saga.sagaId}`);
  }

  private async compensateSellerPayment(saga: SagaState): Promise<void> {
    const event = {
      sagaId: saga.sagaId,
      sellerId: saga.metadata?.sellerId,
      paymentId: saga.metadata?.paymentId,
      timestamp: new Date().toISOString()
    };

    await natsWrapper.client.publish('reverse-seller-payment', JSON.stringify(event));
    console.log(` Published seller payment reversal compensation for saga: ${saga.sagaId}`);
  }

  private async resumeSagaFromLastStep(saga: SagaState): Promise<void> {
    console.log(` Resuming auction completion saga from last step: ${saga.sagaId}`);
    
    switch (saga.state) {
      case AuctionCompletionSagaState.STARTED:
        const request: AuctionCompletionRequest = {
          listingId: saga.metadata?.listingId,
          winnerId: saga.metadata?.winnerId,
          winningBid: saga.metadata?.winningBid,
          sellerId: saga.metadata?.sellerId
        };
        await this.publishAuctionFinalizationEvent(request, saga.sagaId);
        break;
      case AuctionCompletionSagaState.AUCTION_FINALIZED:
        if (saga.metadata?.winnerId) {
          await this.publishPaymentInitiationEvent(saga, saga.metadata.winnerId, saga.metadata.winningBid);
        }
        break;
      case AuctionCompletionSagaState.PAYMENT_PROCESSED:
        await this.publishItemTransferEvent(saga);
        break;
      case AuctionCompletionSagaState.ITEM_TRANSFERRED:
        await this.publishSellerPaymentEvent(saga);
        break;
      case AuctionCompletionSagaState.SELLER_PAID:
        await this.publishCompletionNotificationsEvent(saga);
        await this.completeSaga(saga);
        break;
    }
  }
}
