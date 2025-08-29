FROM node:18-alpine

WORKDIR /app

COPY ./common/package*.json ./
COPY ./common/tsconfig.json ./

RUN npm install --frozen-lockfile

COPY ./common ./common

RUN npm run build --prefix ./common

VOLUME ["/app/common/build"]

CMD ["npm", "start", "--prefix", "./common"]
