FROM node:22-alpine
WORKDIR /app
COPY package*.json tsconfig.base.json ./
COPY packages ./packages
COPY apps ./apps
COPY services ./services
COPY blockchain/chaincode ./blockchain/chaincode
RUN npm ci --ignore-scripts && npm run build -w @defchain/chaincode
WORKDIR /app/blockchain/chaincode
