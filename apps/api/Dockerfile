FROM node:22-slim AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable && corepack prepare pnpm@11.1.2 --activate
WORKDIR /app

COPY pnpm-lock.yaml pnpm-workspace.yaml package.json turbo.json ./
COPY apps/api/package.json apps/api/tsconfig.json apps/api/
COPY packages/config/ packages/config/
COPY packages/core/ packages/core/
COPY packages/sdk/ packages/sdk/
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile

COPY . .
RUN pnpm --filter @annona/api build

EXPOSE 8787
CMD ["pnpm", "--filter", "@annona/api", "start"]
