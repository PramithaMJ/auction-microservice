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
      // Production - use relative URLs (ingress will handle routing)
      return axios.create({
        baseURL: '/',
        withCredentials: true
      })
    }
  }
}

export default buildClient;