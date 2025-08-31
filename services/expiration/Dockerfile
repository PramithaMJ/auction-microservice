FROM node:18-alpine

WORKDIR /app

# Copy and build common package
COPY ./common ./common
WORKDIR /app/common
RUN npm install && npm run build && npm pack --pack-destination /app

# Copy expiration service files
WORKDIR /app
COPY ./services/expiration/package.json ./
COPY ./services/expiration/package-lock.json* ./

# Install dependencies, including common tarball
RUN npm install --no-package-lock --force ./jjmauction-common-*.tgz 
# Copy source and config
COPY ./services/expiration/src ./src
COPY ./services/expiration/tests ./tests
COPY ./services/expiration/tsconfig.json ./tsconfig.json

# Build the application
RUN npm run build 2>/dev/null || npx tsc

EXPOSE 3107

CMD ["npm", "start"]