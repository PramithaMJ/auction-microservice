FROM node:18-alpine

WORKDIR /app

# Copy package.json and package-lock.json (if available)
COPY package*.json ./

# Install dependencies
RUN npm i

# Install typescript for building
RUN npm install -g typescript ts-node

# Copy application source
COPY . .

# Build the application
RUN npm run build 2>/dev/null || tsc

# Expose port
EXPOSE 3106

# Start the application
CMD ["npm", "start"]
