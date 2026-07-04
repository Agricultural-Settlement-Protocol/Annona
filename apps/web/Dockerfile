FROM node:22-slim AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable && corepack prepare pnpm@11.1.2 --activate
WORKDIR /app

COPY pnpm-lock.yaml pnpm-workspace.yaml package.json turbo.json ./
COPY apps/web/package.json apps/web/tsconfig.json apps/web/next.config.ts apps/web/
COPY packages/config/ packages/config/
COPY packages/core/ packages/core/
COPY packages/sdk/ packages/sdk/
COPY packages/ui/ packages/ui/
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile

COPY . .
RUN pnpm --filter @annona/web build

EXPOSE 3000
CMD ["pnpm", "--filter", "@annona/web", "start"]
