import { trace, SpanKind } from '@opentelemetry/api';
import { TracingService } from '@jjmauction/common';

const tracingService = new TracingService('listings-service');

export const traceDbOperation = async <T>(
  operationName: string,
  operation: () => Promise<T>,
  attributes?: Record<string, string | number | boolean>
): Promise<T> => {
  return tracingService.traceAsyncOperation(
    `db.${operationName}`,
    operation,
    {
      kind: SpanKind.CLIENT,
      attributes: {
        'db.operation': operationName,
        'component': 'database',
        ...attributes,
      },
    }
  );
};

export const traceEventOperation = async <T>(
  eventName: string,
  operation: () => Promise<T>,
  attributes?: Record<string, string | number | boolean>
): Promise<T> => {
  return tracingService.traceAsyncOperation(
    `event.${eventName}`,
    operation,
    {
      kind: SpanKind.PRODUCER,
      attributes: {
        'messaging.operation': 'publish',
        'messaging.destination': eventName,
        'component': 'nats',
        ...attributes,
      },
    }
  );
};

export const traceS3Operation = async <T>(
  operationName: string,
  operation: () => Promise<T>,
  attributes?: Record<string, string | number | boolean>
): Promise<T> => {
  return tracingService.traceAsyncOperation(
    `s3.${operationName}`,
    operation,
    {
      kind: SpanKind.CLIENT,
      attributes: {
        'aws.service': 's3',
        'aws.operation': operationName,
        'component': 'aws-s3',
        ...attributes,
      },
    }
  );
};

export { tracingService };
