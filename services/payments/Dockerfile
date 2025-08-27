FROM node:18-alpine

WORKDIR /app

RUN apk add --no-cache \
    python3 \
    py3-pip \
    make \
    g++ \
    bash \
    libc-dev \
    sqlite-dev \
    && ln -sf python3 /usr/bin/python

# Copy and build common package first
COPY ./common /common
WORKDIR /common
RUN npm install && npm run build

# Go back to app directory
WORKDIR /app

# Copy package.json and package-lock.json (if available)
COPY ./services/payments/package*.json ./

# Install dependencies
RUN npm install

# Install typescript for building
RUN npm install -g typescript ts-node

# Copy application source
COPY ./services/payments ./

# Expose port
EXPOSE 3104

# Start the application
CMD ["npm", "start"]
