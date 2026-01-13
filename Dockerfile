# Use an official Node.js runtime as a parent image
FROM node:22-alpine

# Set the working directory
WORKDIR /app

ARG NEXT_PUBLIC_BACKEND_URL
ENV NEXT_PUBLIC_BACKEND_URL=$NEXT_PUBLIC_BACKEND_URL

# Copy package files
COPY package.json ./

# Install dependencies using npm
RUN npm install

# Copy the rest of your application code
COPY . .

# Build the Next.js app
RUN npm run build

# Expose the port your app runs on
EXPOSE 8080

# Set the port environment variable
ENV PORT=8080

# Start the Next.js application
CMD ["npm", "run", "start"]