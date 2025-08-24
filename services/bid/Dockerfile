FROM node:18-alpine

WORKDIR /app

# Install system dependencies required for sqlite3/node-gyp
RUN apk add --no-cache python3 make g++

# Copy package.json and lock file first (to leverage Docker cache)
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy application source
COPY . .

# Expose port
EXPOSE 3102

# Start the application
CMD ["npm", "start"]
