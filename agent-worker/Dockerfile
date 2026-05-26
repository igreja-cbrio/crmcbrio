# Multi-stage build pra deixar a image final pequena.
# Railway usa Nixpacks por padrão (railway.json), mas mantemos o Dockerfile
# pra Fly.io / Cloud Run / Render como fallback.

FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci
COPY tsconfig.json ./
COPY src ./src
COPY skills ./skills
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/skills ./skills

EXPOSE 3030
CMD ["node", "dist/server.js"]
