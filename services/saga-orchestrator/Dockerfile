FROM node:18-alpine

WORKDIR /app

# Copy package.json files first for better caching
COPY package.json ./
COPY package-lock.json* ./

# Install dependencies
RUN npm cache clean --force
RUN rm -f package-lock.json
RUN npm install --no-package-lock --force

# Copy saga-orchestrator service source code
COPY src ./src
COPY tsconfig.json ./

# Expose port
EXPOSE 3108

CMD ["npm", "start"]
