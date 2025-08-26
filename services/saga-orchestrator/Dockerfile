FROM node:18-alpine

WORKDIR /app

# Copy the common package source and build it
COPY ./common ./common
WORKDIR /app/common
RUN npm install && npm run build

# Switch back to app directory and copy saga-orchestrator service files
WORKDIR /app
COPY ./services/saga-orchestrator/package.json ./
COPY ./services/saga-orchestrator/package-lock.json* ./

# Install saga-orchestrator service dependencies
RUN npm cache clean --force
RUN npm install --only=prod

# Copy saga-orchestrator service source code
COPY ./services/saga-orchestrator/ ./

CMD ["npm", "start"]
