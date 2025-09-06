import { v4 as uuidv4 } from 'uuid';
import { BaseSagaOrchestrator, PaymentProcessingRequest } from './interfaces/base-saga-orchestrator';
import { enhancedSagaStateManager, SagaState } from './enhanced-saga-state-manager';
import { natsWrapper } from './nats-wrapper';

enum PaymentProcessingSagaState {
  STARTED = 'STARTED',
  PAYMENT_VALIDATED = 'PAYMENT_VALIDATED',
  FUNDS_AUTHORIZED = 'FUNDS_AUTHORIZED',
  PAYMENT_CAPTURED = 'PAYMENT_CAPTURED',
  INVOICE_GENERATED = 'INVOICE_GENERATED',
  RECEIPT_SENT = 'RECEIPT_SENT',
  COMPLETED = 'COMPLETED',
  COMPENSATING = 'COMPENSATING',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED'
}

interface PaymentValidatedEvent {
  sagaId: string;
  paymentId: string;
  isValid: boolean;
  validationError?: string;
}

interface FundsAuthorizedEvent {
  sagaId: string;
  paymentId: string;
  authorizationId: string;
  amount: number;
}

interface PaymentCapturedEvent {
  sagaId: string;
  paymentId: string;
  transactionId: string;
  capturedAmount: number;
}

interface InvoiceGeneratedEvent {
  sagaId: string;
  paymentId: string;
  invoiceId: string;
  invoiceUrl: string;
}

interface ReceiptSentEvent {
  sagaId: string;
  paymentId: string;
  receiptId: string;
}

export class PaymentProcessingSagaOrchestrator implements BaseSagaOrchestrator<PaymentProcessingRequest> {
  private readonly sagaType = 'payment-processing';

  constructor() {
    this.setupEventListeners();
  }

  async startSaga(request: PaymentProcessingRequest): Promise<string> {
    const sagaId = uuidv4();
    const timestamp = new Date().toISOString();

    console.log(` Starting Payment Processing Saga: ${sagaId} for payment: ${request.paymentId}`);

    const initialState: SagaState = {
      sagaId,
      sagaType: this.sagaType,
      userId: request.userId,
      state: PaymentProcessingSagaState.STARTED,
      completedSteps: [],
      startedAt: timestamp,
      lastUpdatedAt: timestamp,
      priority: 'high', // Payment processing is high priority
      metadata: {
        paymentId: request.paymentId,
        listingId: request.listingId,
        amount: request.amount,
        paymentMethod: request.paymentMethod
      }
    };

    try {
      await enhancedSagaStateManager.saveSagaState(initialState);

      // Start payment validation
      await this.publishPaymentValidationEvent(request, sagaId);

      return sagaId;
    } catch (error: any) {
      console.error(` Failed to start payment processing saga: ${error.message}`);
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

    if (saga.state === PaymentProcessingSagaState.COMPLETED) {
      throw new Error(`Cannot cancel completed saga ${sagaId}`);
    }

    await this.startCompensation(saga);
    await enhancedSagaStateManager.cancelSaga(this.sagaType, sagaId);
  }

  async handleTimeout(sagaId: string): Promise<void> {
    const saga = await this.getSagaStatus(sagaId);
    if (!saga) return;

    console.log(` Handling timeout for payment processing saga: ${sagaId}`);
    await this.startCompensation(saga);
    await enhancedSagaStateManager.markSagaAsFailed(this.sagaType, sagaId, 'Saga timeout');
  }

  private setupEventListeners(): void {
    // Payment validated
    natsWrapper.client.subscribe('payment-validated', 'payment-processing-saga-queue-group')
      .on('message', async (msg: any) => {
        const data: PaymentValidatedEvent = JSON.parse(msg.getData());
        await this.handlePaymentValidated(data);
        msg.ack();
      });

    // Funds authorized
    natsWrapper.client.subscribe('funds-authorized', 'payment-processing-saga-queue-group')
      .on('message', async (msg: any) => {
        const data: FundsAuthorizedEvent = JSON.parse(msg.getData());
        await this.handleFundsAuthorized(data);
        msg.ack();
      });

    // Payment captured
    natsWrapper.client.subscribe('payment-captured', 'payment-processing-saga-queue-group')
      .on('message', async (msg: any) => {
        const data: PaymentCapturedEvent = JSON.parse(msg.getData());
        await this.handlePaymentCaptured(data);
        msg.ack();
      });

    // Invoice generated
    natsWrapper.client.subscribe('invoice-generated', 'payment-processing-saga-queue-group')
      .on('message', async (msg: any) => {
        const data: InvoiceGeneratedEvent = JSON.parse(msg.getData());
        await this.handleInvoiceGenerated(data);
        msg.ack();
      });

    // Receipt sent
    natsWrapper.client.subscribe('receipt-sent', 'payment-processing-saga-queue-group')
      .on('message', async (msg: any) => {
        const data: ReceiptSentEvent = JSON.parse(msg.getData());
        await this.handleReceiptSent(data);
        msg.ack();
      });
  }

  private async publishPaymentValidationEvent(request: PaymentProcessingRequest, sagaId: string): Promise<void> {
    const event = {
      sagaId,
      paymentId: request.paymentId,
      userId: request.userId,
      amount: request.amount,
      paymentMethod: request.paymentMethod,
      listingId: request.listingId,
      timestamp: new Date().toISOString()
    };

    await natsWrapper.client.publish('validate-payment', JSON.stringify(event));
    console.log(` Published payment validation event for saga: ${sagaId}`);
  }

  private async handlePaymentValidated(data: PaymentValidatedEvent): Promise<void> {
    const saga = await this.getSagaStatus(data.sagaId);
    if (!saga) return;

    if (data.isValid) {
      saga.state = PaymentProcessingSagaState.PAYMENT_VALIDATED;
      saga.completedSteps.push('PAYMENT_VALIDATED');
      await enhancedSagaStateManager.saveSagaState(saga);

      // Authorize funds
      await this.publishFundsAuthorizationEvent(saga);
    } else {
      await this.handleSagaFailure(saga, data.validationError || 'Payment validation failed');
    }
  }

  private async publishFundsAuthorizationEvent(saga: SagaState): Promise<void> {
    const event = {
      sagaId: saga.sagaId,
      paymentId: saga.metadata?.paymentId,
      userId: saga.userId,
      amount: saga.metadata?.amount,
      paymentMethod: saga.metadata?.paymentMethod,
      timestamp: new Date().toISOString()
    };

    await natsWrapper.client.publish('authorize-funds', JSON.stringify(event));
    console.log(` Published funds authorization event for saga: ${saga.sagaId}`);
  }

  private async handleFundsAuthorized(data: FundsAuthorizedEvent): Promise<void> {
    const saga = await this.getSagaStatus(data.sagaId);
    if (!saga) return;

    saga.state = PaymentProcessingSagaState.FUNDS_AUTHORIZED;
    saga.completedSteps.push('FUNDS_AUTHORIZED');
    saga.metadata = { ...saga.metadata, authorizationId: data.authorizationId };
    await enhancedSagaStateManager.saveSagaState(saga);

    // Capture payment
    await this.publishPaymentCaptureEvent(saga);
  }

  private async publishPaymentCaptureEvent(saga: SagaState): Promise<void> {
    const event = {
      sagaId: saga.sagaId,
      paymentId: saga.metadata?.paymentId,
      authorizationId: saga.metadata?.authorizationId,
      amount: saga.metadata?.amount,
      timestamp: new Date().toISOString()
    };

    await natsWrapper.client.publish('capture-payment', JSON.stringify(event));
    console.log(` Published payment capture event for saga: ${saga.sagaId}`);
  }

  private async handlePaymentCaptured(data: PaymentCapturedEvent): Promise<void> {
    const saga = await this.getSagaStatus(data.sagaId);
    if (!saga) return;

    saga.state = PaymentProcessingSagaState.PAYMENT_CAPTURED;
    saga.completedSteps.push('PAYMENT_CAPTURED');
    saga.metadata = { 
      ...saga.metadata, 
      transactionId: data.transactionId,
      capturedAmount: data.capturedAmount
    };
    await enhancedSagaStateManager.saveSagaState(saga);

    // Generate invoice
    await this.publishInvoiceGenerationEvent(saga);
  }

  private async publishInvoiceGenerationEvent(saga: SagaState): Promise<void> {
    const event = {
      sagaId: saga.sagaId,
      paymentId: saga.metadata?.paymentId,
      userId: saga.userId,
      listingId: saga.metadata?.listingId,
      amount: saga.metadata?.capturedAmount || saga.metadata?.amount,
      transactionId: saga.metadata?.transactionId,
      timestamp: new Date().toISOString()
    };

    await natsWrapper.client.publish('generate-invoice', JSON.stringify(event));
    console.log(` Published invoice generation event for saga: ${saga.sagaId}`);
  }

  private async handleInvoiceGenerated(data: InvoiceGeneratedEvent): Promise<void> {
    const saga = await this.getSagaStatus(data.sagaId);
    if (!saga) return;

    saga.state = PaymentProcessingSagaState.INVOICE_GENERATED;
    saga.completedSteps.push('INVOICE_GENERATED');
    saga.metadata = { 
      ...saga.metadata, 
      invoiceId: data.invoiceId,
      invoiceUrl: data.invoiceUrl
    };
    await enhancedSagaStateManager.saveSagaState(saga);

    // Send receipt
    await this.publishReceiptSendingEvent(saga);
  }

  private async publishReceiptSendingEvent(saga: SagaState): Promise<void> {
    const event = {
      sagaId: saga.sagaId,
      paymentId: saga.metadata?.paymentId,
      userId: saga.userId,
      invoiceId: saga.metadata?.invoiceId,
      invoiceUrl: saga.metadata?.invoiceUrl,
      amount: saga.metadata?.capturedAmount || saga.metadata?.amount,
      timestamp: new Date().toISOString()
    };

    await natsWrapper.client.publish('send-receipt', JSON.stringify(event));
    console.log(` Published receipt sending event for saga: ${saga.sagaId}`);
  }

  private async handleReceiptSent(data: ReceiptSentEvent): Promise<void> {
    const saga = await this.getSagaStatus(data.sagaId);
    if (!saga) return;

    saga.state = PaymentProcessingSagaState.RECEIPT_SENT;
    saga.completedSteps.push('RECEIPT_SENT');
    saga.metadata = { ...saga.metadata, receiptId: data.receiptId };
    await enhancedSagaStateManager.saveSagaState(saga);

    // Complete the saga
    await this.completeSaga(saga);
  }

  private async completeSaga(saga: SagaState): Promise<void> {
    saga.state = PaymentProcessingSagaState.COMPLETED;
    saga.completedSteps.push('COMPLETED');
    await enhancedSagaStateManager.markSagaAsCompleted(this.sagaType, saga.sagaId);

    console.log(` Payment processing saga completed: ${saga.sagaId}`);
  }

  private async handleSagaFailure(saga: SagaState, error: string): Promise<void> {
    console.log(` Payment processing saga failed: ${saga.sagaId} - ${error}`);
    await this.startCompensation(saga);
    await enhancedSagaStateManager.markSagaAsFailed(this.sagaType, saga.sagaId, error);
  }

  private async startCompensation(saga: SagaState): Promise<void> {
    saga.state = PaymentProcessingSagaState.COMPENSATING;
    saga.compensationRequired = true;
    await enhancedSagaStateManager.saveSagaState(saga);

    console.log(` Starting compensation for payment processing saga: ${saga.sagaId}`);

    const completedSteps = [...saga.completedSteps].reverse();
    
    for (const step of completedSteps) {
      switch (step) {
        case 'FUNDS_AUTHORIZED':
          await this.compensateAuthorization(saga);
          break;
        case 'PAYMENT_CAPTURED':
          await this.compensateCapture(saga);
          break;
        case 'INVOICE_GENERATED':
          await this.compensateInvoice(saga);
          break;
      }
    }
  }

  private async compensateAuthorization(saga: SagaState): Promise<void> {
    const event = {
      sagaId: saga.sagaId,
      paymentId: saga.metadata?.paymentId,
      authorizationId: saga.metadata?.authorizationId,
      timestamp: new Date().toISOString()
    };

    await natsWrapper.client.publish('void-authorization', JSON.stringify(event));
    console.log(` Published authorization void compensation for saga: ${saga.sagaId}`);
  }

  private async compensateCapture(saga: SagaState): Promise<void> {
    const event = {
      sagaId: saga.sagaId,
      paymentId: saga.metadata?.paymentId,
      transactionId: saga.metadata?.transactionId,
      amount: saga.metadata?.capturedAmount,
      timestamp: new Date().toISOString()
    };

    await natsWrapper.client.publish('refund-payment', JSON.stringify(event));
    console.log(` Published payment refund compensation for saga: ${saga.sagaId}`);
  }

  private async compensateInvoice(saga: SagaState): Promise<void> {
    const event = {
      sagaId: saga.sagaId,
      invoiceId: saga.metadata?.invoiceId,
      timestamp: new Date().toISOString()
    };

    await natsWrapper.client.publish('void-invoice', JSON.stringify(event));
    console.log(` Published invoice void compensation for saga: ${saga.sagaId}`);
  }

  private async resumeSagaFromLastStep(saga: SagaState): Promise<void> {
    console.log(` Resuming payment processing saga from last step: ${saga.sagaId}`);
    
    switch (saga.state) {
      case PaymentProcessingSagaState.STARTED:
        const request: PaymentProcessingRequest = {
          paymentId: saga.metadata?.paymentId,
          userId: saga.userId!,
          listingId: saga.metadata?.listingId,
          amount: saga.metadata?.amount,
          paymentMethod: saga.metadata?.paymentMethod
        };
        await this.publishPaymentValidationEvent(request, saga.sagaId);
        break;
      case PaymentProcessingSagaState.PAYMENT_VALIDATED:
        await this.publishFundsAuthorizationEvent(saga);
        break;
      case PaymentProcessingSagaState.FUNDS_AUTHORIZED:
        await this.publishPaymentCaptureEvent(saga);
        break;
      case PaymentProcessingSagaState.PAYMENT_CAPTURED:
        await this.publishInvoiceGenerationEvent(saga);
        break;
      case PaymentProcessingSagaState.INVOICE_GENERATED:
        await this.publishReceiptSendingEvent(saga);
        break;
      case PaymentProcessingSagaState.RECEIPT_SENT:
        await this.completeSaga(saga);
        break;
    }
  }
}
