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

# Copy package.json and package-lock.json (if available)
COPY package*.json ./

# Install dependencies
RUN npm install

# Install typescript for building
RUN npm install -g typescript ts-node

# Copy application source
COPY . .

# Expose port
EXPOSE 3105

# Start the application
CMD ["npm", "start"]
