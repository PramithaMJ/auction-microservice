FROM node:alpine

WORKDIR /app

# Copy expiration and common at the same time so npm can resolve ../common
COPY ./services/expiration ./services/expiration
COPY ./common ./common

WORKDIR /app/services/expiration

# Install deps (will resolve ../common correctly now)
RUN npm install --legacy-peer-deps

# Build expiration service
RUN npm run build

EXPOSE 3107

CMD ["npm", "start"]
