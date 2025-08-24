FROM node:18-alpine

WORKDIR /app

# Install build dependencies for sqlite3 (and node-gyp)
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    bash \
    libc-dev \
    && ln -sf python3 /usr/bin/python

# Copy package.json and package-lock.json first (for better layer caching)
COPY package*.json ./

# Install dependencies (use ci if you have lockfile, otherwise i)
RUN npm ci

# Copy application source
COPY . .

# Expose port
EXPOSE 3000

# Start dev server
CMD ["npm", "run", "dev"]
