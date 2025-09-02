export interface BaseSagaOrchestrator<T> {
  startSaga(request: T): Promise<string>;
  getSagaStatus(sagaId: string): Promise<any>;
  getAllActiveSagas(): Promise<any[]>;
  retrySaga(sagaId: string): Promise<void>;
  cancelSaga(sagaId: string): Promise<void>;
  handleTimeout(sagaId: string): Promise<void>;
}

export interface SagaRequest {
  sagaId?: string;
  timestamp?: string;
}

export interface BidPlacementRequest extends SagaRequest {
  bidId: string;
  userId: string;
  listingId: string;
  bidAmount: number;
  userEmail: string;
}

export interface AuctionCompletionRequest extends SagaRequest {
  listingId: string;
  winnerId?: string;
  winningBid?: number;
  sellerId: string;
}

export interface PaymentProcessingRequest extends SagaRequest {
  paymentId: string;
  userId: string;
  listingId: string;
  amount: number;
  paymentMethod: string;
}
