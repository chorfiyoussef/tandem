# syntax=docker/dockerfile:1.7
# Builds the Tandem API (Hono on Node) as a single bundled file.

FROM node:24-alpine AS build
ENV COREPACK_ENABLE_DOWNLOAD_PROMPT=0 PNPM_HOME=/pnpm PATH=/pnpm:$PATH
RUN corepack enable && corepack prepare pnpm@10.15.0 --activate
WORKDIR /repo
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json .npmrc ./
COPY apps/api/package.json apps/api/
COPY packages/shared/package.json packages/shared/
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile --filter @tandem/api...
COPY packages/shared packages/shared
COPY apps/api apps/api
RUN pnpm --filter @tandem/api build

FROM node:24-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production PORT=4000
COPY --from=build /repo/apps/api/dist ./dist
COPY --from=build /repo/apps/api/package.json ./package.json
USER node
EXPOSE 4000
CMD ["node", "dist/index.js"]
