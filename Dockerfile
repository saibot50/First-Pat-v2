# Build Stage
FROM node:20-slim AS build-stage

WORKDIR /app

# Copy root package files
COPY package*.json ./
RUN npm install

# Copy source and build
COPY . .
RUN npm run build

# Runtime Stage
FROM node:20-slim AS runtime-stage

WORKDIR /app

# Install backend dependencies
COPY backend/package*.json ./backend/
RUN cd backend && npm ci --omit=dev

# Install Chromium + OS dependencies for Playwright (PDF rendering)
RUN npx playwright install --with-deps chromium

# Copy backend source
COPY backend/ ./backend/

# Copy frontend build from previous stage
COPY --from=build-stage /app/dist ./dist

ENV NODE_ENV=production
EXPOSE 8080

WORKDIR /app/backend
CMD ["npm", "start"]
