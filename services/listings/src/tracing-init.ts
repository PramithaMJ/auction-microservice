// Initialize tracing for listings service
import { createTracing } from '@jjmauction/common';

// Initialize tracing before any other modules
const tracing = createTracing('listings-service', '1.0.0');
tracing.initialize();

console.log('🔍 Distributed tracing initialized for Listings Service');

export { tracing };
