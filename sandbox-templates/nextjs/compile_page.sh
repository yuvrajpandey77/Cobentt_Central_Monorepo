#!/bin/bash

# =============================================================================
# E2B Sandbox Compilation Script for Next.js Applications
# =============================================================================
# This script is executed during the sandbox template build process to:
# 1. Ensure the Next.js development server starts successfully
# 2. Verify the application is accessible and responding
# 3. Compile the initial page to ensure everything works
# 4. Run the development server with Turbopack for optimal performance
# =============================================================================

# Server Health Check Function
# =============================================================================
# This function continuously monitors the Next.js development server
# to ensure it's running and responding before proceeding
function ping_server() {
	# Initialize counter for tracking attempts
	counter=0
	
	# Make HTTP request to localhost:3000 and capture response code
	# - curl -s: Silent mode (no progress bar)
	# - -o /dev/null: Discard response body (we only need status code)
	# - -w "%{http_code}": Output only the HTTP response code
	response=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:3000")
	
	# Keep checking until server responds with HTTP 200 (OK)
	while [[ ${response} -ne 200 ]]; do
	  # Increment attempt counter
	  let counter++
	  
	  # Every 20 attempts, show progress message
	  # This prevents the script from being completely silent during long waits
	  if  (( counter % 20 == 0 )); then
        echo "Waiting for server to start... (attempt $counter)"
        # Brief pause to avoid overwhelming the system
        sleep 0.1
      fi

	  # Check server status again
	  response=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:3000")
	done
	
	# Server is now responding with HTTP 200
	echo "✅ Next.js server is running and responding!"
}

# =============================================================================
# MAIN EXECUTION
# =============================================================================

# Start the server health check in the background
# - & runs the function in background
# - This allows the health check to run while we start the server
ping_server &

# Navigate to the application directory and start Next.js development server
# - cd /home/user: Change to the user's home directory (where Next.js app is located)
# - npx next dev: Start Next.js development server
# - --turbopack: Use Turbopack for faster builds and hot reloading
#   Turbopack is Next.js's new bundler, significantly faster than webpack
cd /home/user && npx next dev --turbopack

# =============================================================================
# WHAT HAPPENS NEXT:
# =============================================================================
# 1. The ping_server function runs in background, monitoring localhost:3000
# 2. Next.js development server starts with Turbopack
# 3. Server begins compiling and serving the application
# 4. Once server responds with HTTP 200, health check completes
# 5. Application is ready for development and testing
# 
# The sandbox template build process will wait for this script to complete
# successfully, ensuring the Next.js application is fully functional
# =============================================================================