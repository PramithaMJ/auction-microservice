FROM node:18-alpine

WORKDIR /app

# Install system dependencies required for node-gyp (sqlite3 needs this)
RUN apk add --no-cache python3 make g++ 

# Build the common package
COPY ./common ./common
WORKDIR /app/common
RUN npm install && npm run build

# Back to app root and set up auth service
WORKDIR /app

# Copy only package.json files first for caching
COPY ./services/auth/package.json ./
COPY ./services/auth/package-lock.json* ./

# Install auth service dependencies
RUN npm cache clean --force
RUN rm -f package-lock.json
RUN npm install --no-package-lock --force

# Inject the built common package
RUN mkdir -p node_modules/@jjmauction/common
RUN cp -r /app/common/build/* node_modules/@jjmauction/common/
RUN cp /app/common/package.json node_modules/@jjmauction/common/

# Copy the rest of the auth service code
COPY ./services/auth/ ./

# Expose port
EXPOSE 3101

# Start the application
CMD ["npm", "start"]
