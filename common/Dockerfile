FROM node:18-alpine

WORKDIR /app

# Copy package.json and package-lock.json (if available)
COPY package*.json ./

# Install ALL dependencies (needed for tsc build)
RUN npm install

# Install rimraf globally (safe cross-platform clean)
RUN npm install -g typescript rimraf

# Copy source code
COPY . .

# Build the common package
RUN npm run build

# Volume for build output
VOLUME ["/app/build"]

# Keep container running (builder container)
CMD ["tail", "-f", "/dev/null"]
