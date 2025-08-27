FROM node:18-alpine

WORKDIR /app

# Install system dependencies required for sqlite3/node-gyp
RUN apk add --no-cache python3 make g++

# Copy package.json and lock file first (to leverage Docker cache)
COPY ./services/bid/package*.json ./

# Copy and build common package first
COPY ./common /common
WORKDIR /common
RUN npm install && npm run build

# Go back to app directory
WORKDIR /app

# Install dependencies
RUN npm install

# Copy application source
COPY ./services/bid ./

# Expose port
EXPOSE 3102

# Start the application
CMD ["npm", "start"]
