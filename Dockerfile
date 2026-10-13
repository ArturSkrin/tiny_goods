FROM node:24-slim AS build
WORKDIR /app
RUN npm install -g pnpm@10
COPY . .
RUN pnpm install --frozen-lockfile
# vite.config.ts demands PORT and BASE_PATH even for a build
RUN PORT=3000 BASE_PATH=/ NODE_ENV=production pnpm --filter @workspace/tinygoods run build \
 && NODE_ENV=production pnpm --filter @workspace/api-server run build

# The API bundle is self-contained (esbuild), so the runtime image needs no node_modules.
FROM node:24-slim
WORKDIR /app
ENV NODE_ENV=production PORT=8080 STATIC_DIR=/app/public
COPY --from=build /app/artifacts/api-server/dist ./dist
COPY --from=build /app/artifacts/tinygoods/dist/public ./public
USER node
EXPOSE 8080
CMD ["node", "--enable-source-maps", "dist/index.mjs"]
