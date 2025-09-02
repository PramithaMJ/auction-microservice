// Tracing initialization for API Gateway
import { createTracing } from '@jjmauction/common';

// Initialize tracing before any other modules
const tracing = createTracing('api-gateway', '1.0.0');
tracing.initialize();

console.log('🔍 Distributed tracing initialized for API Gateway');

export { tracing };
