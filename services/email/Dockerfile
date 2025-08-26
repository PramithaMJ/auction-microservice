FROM node:18-alpine

WORKDIR /app

# Copy the common package source and build it
COPY ./common ./common
WORKDIR /app/common
RUN npm install && npm run build

# Switch back to app directory and copy email service files
WORKDIR /app
COPY ./services/email/package.json ./
COPY ./services/email/package-lock.json* ./

# Install email service dependencies (avoid package-lock.json issues)
RUN npm cache clean --force
RUN rm -f package-lock.json
RUN npm install --no-package-lock --force

# Ensure node_modules directory structure exists
RUN mkdir -p node_modules/@jjmauction/common

# Copy the built common package to node_modules
RUN cp -r /app/common/build/* node_modules/@jjmauction/common/
RUN cp /app/common/package.json node_modules/@jjmauction/common/

# Install typescript for building
RUN npm install -g typescript ts-node

# Copy email service source code
COPY ./services/email/ ./

# Build the application
RUN npm run build 2>/dev/null || tsc

# Expose port
EXPOSE 3106

# Start the application
CMD ["npm", "start"]
