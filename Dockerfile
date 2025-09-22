FROM node:18-alpine

# Install FFmpeg for media processing
RUN apk add --no-cache ffmpeg

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY client/package*.json ./client/

# Install dependencies
RUN npm install
RUN cd client && npm install

# Copy source code
COPY . .

# Build client
RUN cd client && npm run build

# Create media directories
RUN mkdir -p media thumbnails

# Expose port
EXPOSE 3000

# Start server
CMD ["npm", "start"]