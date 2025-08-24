// API Gateway Service Configuration
export interface ServiceConfig {
  url: string;
  paths: string[];
}

export interface GatewayConfig {
  server: {
    port: number;
    host: string;
  };
  services: Record<string, ServiceConfig>;
  cors: {
    origin: string | string[];
    credentials: boolean;
    methods: string[];
    allowedHeaders: string[];
  };
  proxy: {
    timeout: number;
    changeOrigin: boolean;
    logLevel: string;
  };
}

const config: GatewayConfig = {
  // Gateway server configuration
  server: {
    port: parseInt(process.env.PORT || '3001'),
    host: process.env.HOST || '0.0.0.0'
  },

  // Microservices endpoints
  services: {
    auth: {
      url: process.env.AUTH_SERVICE_URL || 'http://localhost:3101',
      paths: ['/api/auth']
    },
    bid: {
      url: process.env.BID_SERVICE_URL || 'http://localhost:3102',
      paths: ['/api/bids']
    },
    listings: {
      url: process.env.LISTINGS_SERVICE_URL || 'http://localhost:3103',
      paths: ['/api/listings']
    },
    payments: {
      url: process.env.PAYMENTS_SERVICE_URL || 'http://localhost:3104',
      paths: ['/api/payments']
    },
    profile: {
      url: process.env.PROFILE_SERVICE_URL || 'http://localhost:3105',
      paths: ['/api/profile']
    }
  },

  // CORS configuration
  cors: {
    origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:3000', 'http://localhost:3001'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Cookie']
  },

  // Proxy configuration
  proxy: {
    timeout: 30000,
    changeOrigin: true,
    logLevel: process.env.NODE_ENV === 'development' ? 'debug' : 'warn'
  }
};

export default config;
