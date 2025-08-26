FROM node:18-alpine

WORKDIR /app

# Copy and build common package first
COPY ./common ./common
WORKDIR /app/common
RUN npm install
RUN npm run build

# Switch to service workdir
WORKDIR /app/service

# Copy package.json files first for better caching
COPY ./services/saga-orchestrator/package.json ./
COPY ./services/saga-orchestrator/package-lock.json* ./

# Install dependencies
RUN npm cache clean --force
RUN rm -f package-lock.json
RUN npm install --no-package-lock --force

# Copy saga-orchestrator service source code
COPY ./services/saga-orchestrator ./

# Expose port
EXPOSE 3108

CMD ["npm", "start"]
