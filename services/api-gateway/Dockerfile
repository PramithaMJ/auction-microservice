FROM node:18-alpine

WORKDIR /app

# Copy and build common package first
COPY ./common ./common
WORKDIR /app/common
RUN npm install && npm run build

# Go back to app directory and set up API Gateway
WORKDIR /app
COPY ./services/api-gateway/package*.json ./

# Install dependencies
RUN npm i 

# Copy application source
COPY ./services/api-gateway ./

# Build the application
RUN npm run build

# Expose port
EXPOSE 3001

# Start the application
CMD ["npm", "start"]
