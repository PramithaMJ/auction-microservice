import { Request, Response, NextFunction } from 'express';
import { Bulkhead, BulkheadState } from './bulkhead';

export class BulkheadMiddleware {
  private bulkhead: Bulkhead;
  
  constructor(bulkhead: Bulkhead) {
    this.bulkhead = bulkhead;
  }
  
  // Factory method to create middleware for a specific service
  public forService(serviceName: string) {
    return (req: Request, res: Response, next: NextFunction) => {
      const canExecute = this.bulkhead.canExecute(serviceName);
      
      if (!canExecute.allowed) {
        // Request rejected due to bulkhead
        const fallbackResponse = this.bulkhead.createFallbackResponse(serviceName, req);
        return res.status(429).json(fallbackResponse);
      }
      
      // Start execution tracking
      this.bulkhead.recordExecutionStart(serviceName);
      
      // Add response listener to record completion
      res.on('finish', () => {
        this.bulkhead.recordExecutionComplete(serviceName);
      });
      
      res.on('close', () => {
        // Handle client disconnect
        this.bulkhead.recordExecutionComplete(serviceName);
      });
      
      res.on('error', () => {
        // Handle errors
        this.bulkhead.recordExecutionComplete(serviceName);
      });
      
      next();
    };
  }
  
  // Method to get current bulkhead metrics for all services
  public getMetrics() {
    return (req: Request, res: Response) => {
      const metrics = this.bulkhead.getAllServicesMetrics();
      res.json({
        timestamp: new Date().toISOString(),
        metrics
      });
    };
  }
  
  // Method to reset bulkhead for a service
  public resetBulkhead() {
    return (req: Request, res: Response) => {
      const serviceName = req.params.service;
      this.bulkhead.resetService(serviceName);
      res.json({
        message: `Bulkhead for ${serviceName} has been reset`,
        metrics: this.bulkhead.getServiceMetrics(serviceName)
      });
    };
  }
}
