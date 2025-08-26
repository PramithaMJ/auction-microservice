FROM node:18-alpine

WORKDIR /app

# Install system dependencies required for node-gyp (sqlite3 needs this)
RUN apk add --no-cache python3 make g++

# -------------------------------------------------------------------
# Build the common package and create a tarball in /app
# -------------------------------------------------------------------
COPY ./common ./common
WORKDIR /app/common
RUN npm install && npm run build && npm pack --pack-destination /app

# -------------------------------------------------------------------
# Set up auth service
# -------------------------------------------------------------------
WORKDIR /app

# Copy only package.json files first for caching
COPY ./services/auth/package.json ./
COPY ./services/auth/package-lock.json* ./

# Install auth dependencies + common tarball
RUN npm install --no-package-lock --force ./jjmauction-common-*.tgz

# -------------------------------------------------------------------
# Copy the rest of the auth service code
# -------------------------------------------------------------------
COPY ./services/auth/ ./

# Expose port
EXPOSE 3101

# Start the application
CMD ["npm", "start"]
