FROM node:18-alpine

WORKDIR /app

# Install system dependencies required for node-gyp (sqlite3 needs this)
RUN apk add --no-cache python3 make g++ 

# Copy the common package source and build it
COPY ./common ./common
WORKDIR /app/common
RUN npm install && npm run build

# Switch back to app directory and copy auth service files
WORKDIR /app
COPY ./services/auth/package.json ./
COPY ./services/auth/package-lock.json* ./

# Install auth service dependencies
RUN npm cache clean --force
RUN rm -f package-lock.json
RUN npm install --no-package-lock --force

# Copy the built common package to node_modules
RUN mkdir -p node_modules/@jjmauction
RUN cp -r /app/common/build node_modules/@jjmauction/common
RUN cp /app/common/package.json node_modules/@jjmauction/common/

# Copy auth service source code
COPY ./services/auth/ ./

# Expose port
EXPOSE 3101

# Start the application
CMD ["npm", "start"]
