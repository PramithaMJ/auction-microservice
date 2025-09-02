import axios, { AxiosRequestConfig, AxiosResponse } from 'axios';

export class TracedHttpClient {
  private serviceName: string;

  constructor(serviceName: string) {
    this.serviceName = serviceName;
  }

  async request<T = any>(config: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    // Add correlation headers for tracing
    if (config.headers) {
      config.headers['x-service-name'] = this.serviceName;
    } else {
      config.headers = {
        'x-service-name': this.serviceName,
      };
    }

    try {
      const response = await axios(config);
      console.log(`[${this.serviceName}] HTTP ${config.method?.toUpperCase()} ${config.url} - ${response.status}`);
      return response;
    } catch (error: any) {
      console.error(`[${this.serviceName}] HTTP ${config.method?.toUpperCase()} ${config.url} - ERROR:`, error.message);
      throw error;
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
