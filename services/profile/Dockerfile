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
RUN npm install && npm run build && npm pack --pack-destination /app

# Switch back to app directory and copy profile service files
WORKDIR /app
COPY ./services/profile/package.json ./
COPY ./services/profile/package-lock.json* ./

# Install profile service dependencies + common tarball
RUN npm install --no-package-lock --force ./jjmauction-common-*.tgz

# Copy the source code and configuration files (exclude node_modules explicitly)
COPY ./services/profile/src ./src
COPY ./services/profile/config ./config
COPY ./services/profile/tests ./tests
COPY ./services/profile/tsconfig.json ./tsconfig.json
COPY ./services/profile/tsconfig.prod.json ./tsconfig.prod.json

# Expose port
EXPOSE 3105

# Start the application
CMD ["npm", "start"]
