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
    // Client-side - use API Gateway  
    const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    
    if (isLocal) {
      // Local development - use API Gateway
      return axios.create({
        baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001',
        withCredentials: true
      })
    } else {
      // EC2 or production deployment - construct API Gateway URL using current hostname
      const apiGatewayUrl = `${window.location.protocol}//${window.location.hostname}:3001`;
      return axios.create({
        baseURL: apiGatewayUrl,
        withCredentials: true
      })
    }
  }
}

export default buildClient;