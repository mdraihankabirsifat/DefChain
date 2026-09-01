FROM node:22-alpine AS build
WORKDIR /app
COPY package*.json tsconfig.base.json ./
COPY packages ./packages
COPY services/agency-adapter ./services/agency-adapter
RUN npm ci --ignore-scripts && npm run build -w @defchain/shared && npm run build -w @defchain/fabric-client && npm run build -w @defchain/agency-adapter
CMD ["node", "services/agency-adapter/dist/server.js"]
