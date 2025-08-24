FROM node:alpine


WORKDIR /app

# Copy package files for better layer caching
COPY package*.json ./

# Install dependencies using npm ci for faster, reliable installs
RUN npm install

# Copy application source
COPY . .

# Expose port
EXPOSE 3107

# Start the application
CMD ["npm", "start"]
