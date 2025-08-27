FROM node:18-alpine

WORKDIR /app

RUN apk add --no-cache python3 make g++


COPY ./common ./common
WORKDIR /app/common
RUN npm install && npm run build && npm pack --pack-destination /app

WORKDIR /app

COPY ./services/auth/package.json ./
COPY ./services/auth/package-lock.json* ./

# Install auth dependencies + common tarball
RUN npm install --no-package-lock --force ./jjmauction-common-*.tgz

# Copy the source code and configuration files (exclude node_modules explicitly)
COPY ./services/auth/src ./src
COPY ./services/auth/config ./config
COPY ./services/auth/tests ./tests
COPY ./services/auth/tsconfig.json ./tsconfig.json
COPY ./services/auth/tsconfig.prod.json ./tsconfig.prod.json

EXPOSE 3101

CMD ["npm", "start"]
