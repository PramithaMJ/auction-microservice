FROM node:18

WORKDIR /app

# Copy package.json and install dependencies
COPY package.json ./
RUN npm install

# Copy source code
COPY . .

# Build the common package
RUN npm run build

# Keep container running (this is just a builder container)
CMD ["tail", "-f", "/dev/null"]
