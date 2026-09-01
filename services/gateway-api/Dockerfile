FROM node:22-alpine AS build
WORKDIR /app
COPY package*.json tsconfig.base.json ./
COPY packages ./packages
COPY services/gateway-api ./services/gateway-api
RUN npm ci --ignore-scripts && npm run build -w @defchain/shared && npm run build -w @defchain/fabric-client && npm run build -w @defchain/gateway-api
CMD ["node", "services/gateway-api/dist/server.js"]
