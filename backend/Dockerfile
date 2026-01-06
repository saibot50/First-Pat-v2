FROM node:20-slim

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

# Install Chromium + OS dependencies for Playwright (PDF rendering)
RUN npx playwright install --with-deps chromium

COPY . .

ENV NODE_ENV=production
EXPOSE 8080
CMD ["npm", "start"]