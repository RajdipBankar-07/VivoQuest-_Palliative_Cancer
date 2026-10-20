FROM node:20-alpine

# Set work directory
WORKDIR /app

# Install dependencies first (for caching)
COPY package.json package-lock.json /app/
RUN npm ci

# Copy project files
COPY . /app/

# Build app (supports pre-rendering for instant navigation)
RUN npm run build

# Expose port
EXPOSE 3000

# Start production server
CMD ["npm", "run", "start"]
