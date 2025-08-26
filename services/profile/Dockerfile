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

# Install profile service dependencies (avoid package-lock.json issues)
RUN npm cache clean --force
RUN rm -f package-lock.json
RUN npm install --no-package-lock --force

# Create the necessary directory structure for common package
RUN mkdir -p node_modules/@jjmauction/common

# Copy the built common package to node_modules
RUN cp -r /app/common/build/* node_modules/@jjmauction/common/
RUN cp /app/common/package.json node_modules/@jjmauction/common/

# Install typescript for building
RUN npm install -g typescript ts-node

# Copy profile service source code
COPY ./services/profile/ ./

# Expose port
EXPOSE 3105

# Start the application
CMD ["npm", "start"]
