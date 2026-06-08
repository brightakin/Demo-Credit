# ─── Stage 1: Build ──────────────────────────────────────────────────────────
# We use a full Node image just to compile TypeScript.
# This stage produces the compiled JS in /app/dist.
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files first so Docker can cache the dependency layer.
# If only source code changes (not package.json/yarn.lock), Docker reuses
# the cached node_modules layer and skips re-installing — faster builds.
COPY package.json yarn.lock ./

RUN yarn install --frozen-lockfile

# Copy the rest of the source code, then compile TypeScript → JavaScript
COPY . .
RUN yarn build


# ─── Stage 2: Production ─────────────────────────────────────────────────────
# We start fresh from a clean base image. Only the compiled output from the
# builder stage is copied across — no TypeScript compiler, no devDependencies,
# no source files. This keeps the final image small and safe.
FROM node:20-alpine AS production

WORKDIR /app

# Install only production dependencies
COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile --production

# Copy the compiled JavaScript from the builder stage
COPY --from=builder /app/dist ./dist

EXPOSE 3000

# The entrypoint runs migrations then starts the server.
# Using "exec" form (array) ensures the Node process receives OS signals
# (e.g. SIGTERM from `docker stop`) instead of a shell swallowing them.
CMD ["node", "dist/server.js"]
