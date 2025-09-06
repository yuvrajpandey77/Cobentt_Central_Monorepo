# =============================================================================
# E2B Sandbox Dockerfile for Next.js Development Environment
# =============================================================================
# This Dockerfile creates a complete Next.js development environment with:
# - Node.js 21 runtime
# - Next.js 15.3.3 application
# - Shadcn UI components library
# - All necessary dependencies and configurations
# =============================================================================

# Base Image Selection
# =============================================================================
# Using Node.js 21 slim image as base
# - Slim version reduces image size by excluding unnecessary packages
# - Node.js 21 provides latest LTS features and performance improvements
# - Debian-based for compatibility with apt package manager
FROM node:21-slim

# System Dependencies Installation
# =============================================================================
# Install curl for potential HTTP requests and debugging
# - apt-get update: Refresh package list from repositories
# - apt-get install -y curl: Install curl package (-y flag for non-interactive)
# - apt-get clean: Remove downloaded package files to save space
# - rm -rf /var/lib/apt/lists/*: Remove package lists to reduce image size
# This is a best practice for Docker images to keep them lean
RUN apt-get update && apt-get install -y curl && apt-get clean && rm -rf /var/lib/apt/lists/*

# Script Setup and Permissions
# =============================================================================
# Copy the compilation script from host to container
# - compile_page.sh: Script that handles the actual compilation process
# - /compile_page.sh: Destination path in the container
COPY compile_page.sh /compile_page.sh

# Make the script executable
# - chmod +x: Add execute permission for all users
# - This allows the script to be run as a command
# Note: There was a typo in original file (.sh instead of .sh)
RUN chmod +x /compile_page.sh

# Working Directory Setup
# =============================================================================
# Set the working directory for subsequent commands
# - /home/user/nextjs-app: Temporary directory for Next.js app creation
# - This is where we'll initially create the application
# - We'll move everything to /home/user later for proper sandbox structure
WORKDIR /home/user/nextjs-app

# Next.js Application Creation
# =============================================================================
# Create a new Next.js application using create-next-app
# - npx --yes: Execute package without installing globally (--yes for non-interactive)
# - create-next-app@15.3.3: Use specific version for consistency
# - .: Create app in current directory (WORKDIR)
# - --yes: Skip all prompts and use default configurations
# This creates a complete Next.js project structure with:
# - React components and pages
# - TypeScript configuration
# - ESLint and other development tools
# - Package.json with all necessary dependencies
RUN npx --yes create-next-app@15.5.0 . --yes

# Shadcn UI Library Initialization
# =============================================================================
# Initialize Shadcn UI components library
# - shadcn@2.6.3: Use specific version for consistency
# - init: Initialize the Shadcn UI configuration
# - --yes: Skip all prompts
# - -b neutral: Use neutral color scheme (alternative to default)
# - --force: Overwrite existing configuration if present
# This sets up:
# - Tailwind CSS configuration
# - Component library structure
# - CSS variables for theming
# - Component configuration files
RUN npx --yes shadcn@2.6.3 init --yes -b neutral --force

# Shadcn UI Components Installation
# =============================================================================
# Install all available Shadcn UI components
# - add --all: Install every available component
# - --yes: Skip all prompts and use default configurations
# This installs components like:
# - Button, Input, Card, Dialog, etc.
# - All components are added to components/ui/ directory
# - Each component comes with TypeScript types and Tailwind styles
# - Components are fully customizable and accessible
RUN npx --yes shadcn@2.6.3 add --all --yes

# Sandbox Structure Finalization
# =============================================================================
# Move the entire Next.js application to the user's home directory
# - mv /home/user/nextjs-app/* /home/user/: Move all contents to parent directory
# - rm -rf /home/user/nextjs-app: Remove the temporary directory
# This step is crucial because:
# - E2B sandbox expects applications to be in /home/user/
# - The working directory should be the root of the application
# - This ensures proper file structure for the sandbox environment
# - All Next.js files, components, and configurations are now accessible
RUN mv /home/user/nextjs-app/* /home/user/ && rm -rf /home/user/nextjs-app

# =============================================================================
# FINAL RESULT:
# =============================================================================
# After this Dockerfile runs, the container will have:
# 1. A complete Next.js 15.3.3 application in /home/user/
# 2. All Shadcn UI components installed and configured
# 3. TypeScript, ESLint, and other development tools ready
# 4. Tailwind CSS configured with Shadcn UI theme
# 5. Proper sandbox structure for E2B environment
# 
# The application can be started with:
# - npm run dev (development mode)
# - npm run build (production build)
# - npm start (production start)
# =============================================================================