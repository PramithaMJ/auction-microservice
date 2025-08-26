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

# Copy the common package source and build it
COPY ./common ./common
WORKDIR /app/common
RUN npm install && npm run build

# Switch back to app directory and copy profile service files
WORKDIR /app
COPY ./services/profile/package.json ./
COPY ./services/profile/package-lock.json* ./

# Install profile service dependencies
RUN npm cache clean --force
RUN npm install

# Install typescript for building
RUN npm install -g typescript ts-node

# Copy profile service source code
COPY ./services/profile/ ./

# Expose port
EXPOSE 3105

# Start the application
CMD ["npm", "start"]
