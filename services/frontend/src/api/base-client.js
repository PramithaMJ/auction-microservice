import axios from 'axios';

const buildClient = (context) => {
  if(typeof window === 'undefined'){
    // Server-side rendering - use internal Docker hostname for SSR
    const baseURL = process.env.SERVER_API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
    return axios.create({
      baseURL: baseURL,
      headers: context.req.headers,
      withCredentials: true
    })
  }else{
    // Client-side - use configured API URL or construct from current location
    let baseURL;
    
    // First priority: Use explicitly configured API URL
    if (process.env.NEXT_PUBLIC_API_URL) {
      baseURL = process.env.NEXT_PUBLIC_API_URL;
    } 
    // Second priority: Use configured API Gateway port with current hostname
    else if (process.env.NEXT_PUBLIC_API_GATEWAY_PORT) {
      baseURL = `${window.location.protocol}//${window.location.hostname}:${process.env.NEXT_PUBLIC_API_GATEWAY_PORT}`;
    }
    // Third priority: Use same host with configured port or default port
    else {
      const port = process.env.NEXT_PUBLIC_API_GATEWAY_PORT || '3001';
      const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
      
      if (isLocal) {
        baseURL = `http://localhost:${port}`;
      } else {
        baseURL = `${window.location.protocol}//${window.location.hostname}:${port}`;
      }
    }
    
    return axios.create({
      baseURL: baseURL,
      withCredentials: true
    })
  }
}

export default buildClient;