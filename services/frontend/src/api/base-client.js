import axios from 'axios';

const buildClient = (context) => {
  if(typeof window === 'undefined'){
    // Server-side rendering - use internal Docker hostname for SSR
    const baseURL = process.env.SERVER_API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
    
    // If we have req/headers in the context, include them
    const headers = context?.req?.headers || {};
    
    return axios.create({
      baseURL: baseURL,
      headers: headers,
      withCredentials: true
    })
  }else{
    // Client-side - use configured API URL or construct from current location
    let baseURL;
    
    // First priority: Use explicitly configured API URL
    if (process.env.NEXT_PUBLIC_API_URL) {
      baseURL = process.env.NEXT_PUBLIC_API_URL;
      console.log(`Using configured API URL: ${baseURL}`);
    } 
    // Second priority: Use configured API Gateway port with current hostname
    else if (process.env.NEXT_PUBLIC_API_GATEWAY_PORT) {
      baseURL = `${window.location.protocol}//${window.location.hostname}:${process.env.NEXT_PUBLIC_API_GATEWAY_PORT}`;
      console.log(`Using API URL with configured port: ${baseURL}`);
    }
    // Third priority: Use same host with configured port or default port
    else {
      const port = process.env.NEXT_PUBLIC_API_GATEWAY_PORT || '3001';
      const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
      const isProduction = window.location.hostname === '98.87.131.233' || process.env.NEXT_PUBLIC_SERVER_IP === window.location.hostname;
      
      if (isLocal) {
        baseURL = `http://localhost:${port}`;
      } else if (isProduction) {
        // Ensure we use the correct URL for the production server
        baseURL = `http://${window.location.hostname}:${port}`;
      } else {
        baseURL = `${window.location.protocol}//${window.location.hostname}:${port}`;
      }
      console.log(`Using auto-detected API URL: ${baseURL}`);
    }
    
    return axios.create({
      baseURL: baseURL,
      withCredentials: true
    })
  }
}

export default buildClient;