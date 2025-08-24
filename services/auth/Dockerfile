FROM node:18-alpine

WORKDIR /app

# Install system dependencies required for node-gyp (sqlite3 needs this)
RUN apk add --no-cache python3 make g++ 

# Copy package.json and install deps
COPY package*.json ./
RUN npm install

# Copy application source
COPY . .

# Expose port
EXPOSE 3101

# Start the application
CMD ["npm", "start"]
