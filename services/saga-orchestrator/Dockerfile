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

# Install saga-orchestrator service dependencies (avoid package-lock.json issues)
RUN npm cache clean --force
RUN rm -f package-lock.json
RUN npm install --no-package-lock --force

# Ensure node_modules exists and copy the built common package
RUN mkdir -p node_modules/@jjmauction/common
RUN cp -r /app/common/build/* node_modules/@jjmauction/common/
RUN cp /app/common/package.json node_modules/@jjmauction/common/

# Copy saga-orchestrator service source code
COPY ./services/saga-orchestrator/ ./

CMD ["npm", "start"]
