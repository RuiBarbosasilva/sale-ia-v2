FROM node:22-bookworm-slim

ENV NODE_ENV=production
ENV PORT=3000
ENV DATABASE_URL=file:/var/lib/sale-ia/saleia.db

WORKDIR /app

RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates curl \
  && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
RUN npm ci --no-audit --no-fund

COPY prisma ./prisma
COPY tsconfig.json ./
COPY src ./src
COPY public ./public
COPY tools ./tools
COPY guardian ./guardian
COPY tests ./tests

RUN npm run build

RUN mkdir -p /var/lib/sale-ia /app/storage/generated-images \
  && chown -R node:node /app /var/lib/sale-ia

USER node

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=60s --retries=3 \
  CMD curl -fsS http://127.0.0.1:3000/api/health || exit 1

CMD ["sh", "-c", "npx prisma migrate deploy && npm start"]
