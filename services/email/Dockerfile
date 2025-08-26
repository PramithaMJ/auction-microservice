FROM node:18-alpine

WORKDIR /app

# Copy the common package source and build it
COPY ./common ./common
WORKDIR /app/common
RUN npm install && npm run build && npm pack --pack-destination /app

# Switch back to app directory and copy email service files
WORKDIR /app
COPY ./services/email/package.json ./
COPY ./services/email/package-lock.json* ./

# Install email service dependencies + common tarball
RUN npm install --no-package-lock --force ./jjmauction-common-*.tgz

# Copy the source code and configuration files (exclude node_modules explicitly)
COPY ./services/email/src ./src
COPY ./services/email/tests ./tests
COPY ./services/email/tsconfig.json ./tsconfig.json
COPY ./services/email/tsconfig.prod.json ./tsconfig.prod.json

# Build the application
RUN npm run build 2>/dev/null || npx tsc

# Expose port
EXPOSE 3106

# Start the application
CMD ["npm", "start"]
