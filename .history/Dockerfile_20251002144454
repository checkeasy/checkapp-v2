# Stage 1: Build
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY FRONT/package*.json ./FRONT/
WORKDIR /app/FRONT
RUN npm install

# Copy source code
COPY FRONT/ .

# Build the application
RUN npm run build

# Stage 2: Production
FROM node:20-alpine

WORKDIR /app

# Install serve globally
RUN npm install -g serve

# Copy built files from builder
COPY --from=builder /app/FRONT/dist ./dist

# Expose port (Railway sets this dynamically)
EXPOSE 3000

# Start the application
CMD ["sh", "-c", "serve -s dist -p ${PORT:-3000}"]

