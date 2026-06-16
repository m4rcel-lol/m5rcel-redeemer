FROM node:22-alpine AS dependencies
WORKDIR /app
RUN apk add --no-cache python3 make g++
COPY package.json package-lock.json ./
RUN npm ci

FROM node:22-alpine AS build
WORKDIR /app
COPY --from=dependencies /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:22-alpine AS production-dependencies
WORKDIR /app
RUN apk add --no-cache python3 make g++
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

FROM node:22-alpine AS runtime
ENV NODE_ENV=production
ENV PORT=10513
ENV DB_PATH=/data/redeemer.sqlite
WORKDIR /app

RUN apk add --no-cache libstdc++ \
  && addgroup -S redeemer \
  && adduser -S redeemer -G redeemer \
  && mkdir -p /data \
  && chown -R redeemer:redeemer /data /app

COPY --from=production-dependencies --chown=redeemer:redeemer /app/node_modules ./node_modules
COPY --from=build --chown=redeemer:redeemer /app/dist ./dist
COPY --from=build --chown=redeemer:redeemer /app/package.json ./package.json

USER redeemer
EXPOSE 10513

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:' + (process.env.PORT || '10513') + '/healthz').then(r => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"

CMD ["node", "dist/server/index.js"]
