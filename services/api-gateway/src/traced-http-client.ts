import { trace, context, SpanKind, SpanStatusCode } from '@opentelemetry/api';
import axios, { AxiosRequestConfig, AxiosResponse } from 'axios';

export class TracedHttpClient {
  private serviceName: string;

  constructor(serviceName: string) {
    this.serviceName = serviceName;
  }

  async request<T = any>(config: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    const tracer = trace.getTracer(this.serviceName);
    const span = tracer.startSpan(`HTTP ${config.method?.toUpperCase()} ${config.url}`, {
      kind: SpanKind.CLIENT,
      attributes: {
        'http.method': config.method?.toUpperCase() || 'GET',
        'http.url': config.url || '',
        'component': 'http-client',
        'service.name': this.serviceName,
      },
    });

    // Add trace headers for propagation
    const traceHeaders = {};
    trace.setSpan(context.active(), span);
    
    // Inject trace context into headers
    if (config.headers) {
      config.headers['x-trace-id'] = span.spanContext().traceId;
      config.headers['x-span-id'] = span.spanContext().spanId;
    } else {
      config.headers = {
        'x-trace-id': span.spanContext().traceId,
        'x-span-id': span.spanContext().spanId,
      };
    }

    try {
      const response = await axios(config);
      
      span.setAttributes({
        'http.status_code': response.status,
        'http.response_size': JSON.stringify(response.data).length,
      });
      
      span.setStatus({ code: SpanStatusCode.OK });
      return response;
    } catch (error: any) {
      span.setAttributes({
        'http.status_code': error.response?.status || 0,
        'error': true,
      });
      
      span.setStatus({
        code: SpanStatusCode.ERROR,
        message: error.message || 'HTTP request failed',
      });
      
      span.recordException(error);
      throw error;
    } finally {
      span.end();
    }
  }

  async get<T = any>(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    return this.request<T>({ ...config, method: 'GET', url });
  }

  async post<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    return this.request<T>({ ...config, method: 'POST', url, data });
  }

  async put<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    return this.request<T>({ ...config, method: 'PUT', url, data });
  }

  async delete<T = any>(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    return this.request<T>({ ...config, method: 'DELETE', url });
  }
}
