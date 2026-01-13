# Build Stage
FROM node:20-slim AS build-stage

WORKDIR /app

# Accept build-time environment variables
ARG VITE_FIREBASE_API_KEY
ARG VITE_FIREBASE_AUTH_DOMAIN
ARG VITE_FIREBASE_PROJECT_ID
ARG VITE_FIREBASE_STORAGE_BUCKET
ARG VITE_FIREBASE_MESSAGING_SENDER_ID
ARG VITE_FIREBASE_APP_ID
ARG VITE_AUTH_ACTION_URL

ENV VITE_FIREBASE_API_KEY=$VITE_FIREBASE_API_KEY
ENV VITE_FIREBASE_AUTH_DOMAIN=$VITE_FIREBASE_AUTH_DOMAIN
ENV VITE_FIREBASE_PROJECT_ID=$VITE_FIREBASE_PROJECT_ID
ENV VITE_FIREBASE_STORAGE_BUCKET=$VITE_FIREBASE_STORAGE_BUCKET
ENV VITE_FIREBASE_MESSAGING_SENDER_ID=$VITE_FIREBASE_MESSAGING_SENDER_ID
ENV VITE_FIREBASE_APP_ID=$VITE_FIREBASE_APP_ID
ENV VITE_AUTH_ACTION_URL=$VITE_AUTH_ACTION_URL

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
