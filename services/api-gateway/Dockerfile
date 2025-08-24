FROM node:18-alpine

WORKDIR /app

# Copy package.json and package-lock.json (if available)
COPY package*.json ./

# Install dependencies
RUN npm i 

# Copy application source
COPY . .

# Build the application
RUN npm run build

# Expose port
EXPOSE 3001


# Start the application
CMD ["npm", "start"]
