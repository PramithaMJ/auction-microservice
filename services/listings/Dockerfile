FROM node:18-alpine

WORKDIR /app

# Install build dependencies for sqlite3 / node-gyp
RUN apk add --no-cache \
    python3 \
    py3-pip \
    make \
    g++ \
    bash \
    libc-dev \
    sqlite-dev \
    && ln -sf python3 /usr/bin/python

# Copy package.json and lockfile first (better caching)
COPY package*.json ./

# Install dependencies
RUN npm ci

# Install typescript globally
RUN npm install -g typescript ts-node

# Copy source
COPY . .

# Expose port
EXPOSE 3103

CMD ["npm", "start"]
