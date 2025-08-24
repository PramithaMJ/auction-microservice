import express, { Request, Response, NextFunction } from 'express';
import axios from 'axios';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import FormData from 'form-data';
import config from '../config/default';

interface CustomError extends Error {
  status?: number;
}

class ApiGateway {
  private app: express.Application;

  constructor() {
    this.app = express();
    this.setupMiddleware();
    this.setupRoutes();
    this.setupErrorHandling();
  }

  private setupMiddleware(): void {
    // Security middleware
    this.app.use(
      helmet({
        crossOriginEmbedderPolicy: false,
        contentSecurityPolicy: false,
      })
    );

    // CORS middleware
    this.app.use(cors(config.cors));

    // Logging middleware
    if (process.env.NODE_ENV !== 'test') {
      this.app.use(morgan('combined'));
    }

    // Custom middleware to handle different content types
    this.app.use((req: Request, res: Response, next: NextFunction) => {
      const contentType = req.headers['content-type'];

      if (contentType && contentType.includes('multipart/form-data')) {
        // For multipart form data, collect raw body
        const chunks: Buffer[] = [];
        req.on('data', (chunk: Buffer) => {
          chunks.push(chunk);
        });
        req.on('end', () => {
          (req as any).rawBody = Buffer.concat(chunks);
          next();
        });
      } else {
        // For other content types, use default parsing
        express.json({ limit: '10mb' })(req, res, () => {
          express.urlencoded({ extended: true, limit: '10mb' })(req, res, next);
        });
      }
    });
  }

  private setupRoutes(): void {
    // Health check endpoint
    this.app.get('/health', (req: Request, res: Response) => {
      res.status(200).json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        services: config.services
      });
    });

    // API documentation endpoint
    this.app.get('/api', (req: Request, res: Response) => {
      res.status(200).json({
        message: 'Auction Website API Gateway',
        version: '1.0.0',
        services: Object.keys(config.services),
        endpoints: Object.entries(config.services).reduce((acc, [name, service]) => {
            acc[name] = {
              url: service.url,
              paths: service.paths,
            };
            return acc;
        }, {} as Record<string, { url: string; paths: string[] }>)
      });
    });

    // Setup service proxies using axios
    Object.entries(config.services).forEach(([serviceName, serviceConfig]) => {
      serviceConfig.paths.forEach((path) => {
        console.log(` Proxying ${path}/* → ${serviceConfig.url}`);

        // Handle exact path match (e.g., /api/listings)
        this.app.all(path, async (req: Request, res: Response) => {
          await this.proxyRequest(req, res, serviceConfig.url, serviceName);
        });

        // Handle wildcard path match (e.g., /api/listings/*)
        this.app.all(`${path}/*`, async (req: Request, res: Response) => {
          await this.proxyRequest(req, res, serviceConfig.url, serviceName);
        });
      });
    });

    // Catch-all route for unmatched paths
    this.app.all('*', (req: Request, res: Response) => {
      res.status(404).json({
        error: 'Not Found',
        message: `Route ${req.method} ${req.path} not found`,
        availableServices: Object.keys(config.services),
        timestamp: new Date().toISOString()
      });
    });
  }

  private async proxyRequest(
    req: Request,
    res: Response,
    targetUrl: string,
    serviceName: string
  ): Promise<void> {
    try {
      console.log(
        ` Proxying ${req.method} ${req.originalUrl} → ${serviceName}`
      );
      const fullTargetUrl = `${targetUrl}${req.originalUrl}`;
      console.log(` Forwarding to: ${fullTargetUrl}`);
      const axiosConfig: any = {
        method: req.method.toLowerCase(),
        url: fullTargetUrl,
        headers: {
          'Content-Type': req.headers['content-type'] || 'application/json',
          'User-Agent': req.headers['user-agent'] || 'api-gateway',
          Accept: req.headers['accept'] || '*/*',
          Cookie: req.headers['cookie'] || '',
        },
        timeout: config.proxy.timeout,
        validateStatus: () => true, // Don't throw errors for HTTP error status codes
      };

      // Handle different content types appropriately
      if (req.method !== 'GET') {
        const contentType = req.headers['content-type'];
        if (contentType && contentType.includes('multipart/form-data')) {
          // For multipart form data, use the raw body
          axiosConfig.data = (req as any).rawBody;
          axiosConfig.maxContentLength = Infinity;
          axiosConfig.maxBodyLength = Infinity;
        } else if (req.body) {
          // For JSON and URL-encoded data, use the parsed body
          axiosConfig.data = req.body;
        }
      }

      // Add query parameters
      if (req.query && Object.keys(req.query).length > 0) {
        axiosConfig.params = req.query;
      }

      const response = await axios(axiosConfig);
      
      console.log(` Response from ${serviceName}: ${response.status}`);
      
      // Forward response headers
      Object.keys(response.headers).forEach(header => {
        if (header.toLowerCase() !== 'content-encoding') {
          res.set(header, response.headers[header]);
        }
      });
      
      res.status(response.status).json(response.data);
      
    } catch (error: any) {
      console.error(` Proxy Error for ${serviceName}:`, error.message);
      
      if (error.response) {
        // The request was made and the server responded with a status code
        console.log(` Error status: ${error.response.status}`);
        res.status(error.response.status).json(error.response.data);
      } else if (error.request) {
        // The request was made but no response was received
        console.log(` No response from ${serviceName}`);
        res.status(503).json({
          error: 'Service Unavailable',
          message: `${serviceName} service is currently unavailable`,
          timestamp: new Date().toISOString()
        });
      } else {
        // Something happened in setting up the request
        console.log(` Request setup error: ${error.message}`);
        res.status(500).json({
          error: 'Internal Server Error',
          message: 'Failed to proxy request',
          timestamp: new Date().toISOString()
        });
      }
    }
  }

  private setupErrorHandling(): void {
    // Global error handler
    this.app.use((err: CustomError, req: Request, res: Response, next: NextFunction) => {
      console.error(' Gateway Error:', err);
      
      res.status(err.status || 500).json({
        error: 'Internal Server Error',
        message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong',
        timestamp: new Date().toISOString()
      });
    });
  }

  public async start(): Promise<void> {
    try {
      const server = this.app.listen(config.server.port, config.server.host, () => {
        console.log(' API Gateway started successfully!');
        console.log(` Gateway URL: http://${config.server.host}:${config.server.port}`);
        console.log(' Service Routes:');
        
        Object.entries(config.services).forEach(([name, service]) => {
          service.paths.forEach(path => {
            console.log(`   ${path}/* → ${service.url}`);
          });
        });
        
        console.log('\n Available Endpoints:');
        console.log(`   GET  /health - Health check`);
        console.log(`   GET  /api - API documentation`);
        console.log('');
      });

      // Graceful shutdown
      process.on('SIGTERM', () => {
        console.log('📴 Received SIGTERM, shutting down gracefully...');
        server.close(() => {
          console.log(' API Gateway stopped');
          process.exit(0);
        });
      });

      process.on('SIGINT', () => {
        console.log('📴 Received SIGINT, shutting down gracefully...');
        server.close(() => {
          console.log(' API Gateway stopped');
          process.exit(0);
        });
      });

    } catch (error) {
      console.error(' Failed to start API Gateway:', error);
      process.exit(1);
    }
  }
}

// Start the gateway if this file is run directly
if (require.main === module) {
  const gateway = new ApiGateway();
  gateway.start();
}

export default ApiGateway;
