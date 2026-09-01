FROM node:22-alpine AS build
WORKDIR /app
COPY package*.json tsconfig.base.json ./
COPY packages/shared ./packages/shared
COPY apps/web ./apps/web
RUN npm ci --ignore-scripts && npm run build -w @defchain/shared && npm run build -w @defchain/web
FROM nginx:1.29-alpine
COPY --from=build /app/apps/web/dist /usr/share/nginx/html
