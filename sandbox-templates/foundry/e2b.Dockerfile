# =============================================================================
# E2B Sandbox Dockerfile for Foundry/Solidity Development
# =============================================================================
# Based on proven local installation method
# =============================================================================

# Use Node.js base image (consistent with NextJS template)
FROM node:21-slim

# System Dependencies Installation
RUN apt-get update && apt-get install -y \
    build-essential \
    libssl-dev \
    pkg-config \
    curl \
    git \
    wget \
    tar \
    gzip \
    sudo \
    && apt-get clean && rm -rf /var/lib/apt/lists/*

# Create user
RUN useradd -m -s /bin/bash user && \
    echo "user ALL=(ALL) NOPASSWD:ALL" >> /etc/sudoers

# Switch to user
USER user
WORKDIR /home/user

# Install Foundry using your exact method
RUN curl -L https://foundry.paradigm.xyz | bash && \
    export PATH="$PATH:$HOME/.foundry/bin" && \
    ~/.foundry/bin/foundryup

# Add Foundry to PATH permanently
RUN echo 'export PATH="$PATH:$HOME/.foundry/bin"' >> ~/.bashrc && \
    echo 'export PATH="$PATH:$HOME/.foundry/bin"' >> ~/.profile

# Configure Git for forge init
RUN git config --global user.email "user@example.com" && \
    git config --global user.name "User"

# Create hello_template project using your method (with PATH export)
RUN export PATH="$PATH:$HOME/.foundry/bin" && \
    forge init --template https://github.com/foundry-rs/forge-template hello_template

# Install comprehensive library ecosystem for all contract types
# Note: Installing libraries sequentially to avoid dependency conflicts
# Note: Governance contracts are included in openzeppelin-contracts/governance
RUN export PATH="$PATH:$HOME/.foundry/bin" && \
    cd hello_template && \
    forge install OpenZeppelin/openzeppelin-contracts@v5.0.0 && \
    forge install OpenZeppelin/openzeppelin-contracts-upgradeable@v5.0.0

# Install Solmate (lightweight, modern Solidity library)
RUN export PATH="$PATH:$HOME/.foundry/bin" && \
    cd hello_template && \
    forge install transmissions11/solmate@v7 || echo "Solmate installation skipped (optional)"

# Install PRB Math for fixed-point arithmetic
RUN export PATH="$PATH:$HOME/.foundry/bin" && \
    cd hello_template && \
    forge install PaulRBerg/prb-math@v3.1.0 || echo "PRB Math installation skipped (optional)"

# Install Uniswap V3 for DeFi integration (optional but useful)
RUN export PATH="$PATH:$HOME/.foundry/bin" && \
    cd hello_template && \
    forge install Uniswap/v3-core@1.0.0 || echo "Uniswap V3 Core installation skipped (optional)" && \
    forge install Uniswap/v3-periphery@1.0.0 || echo "Uniswap V3 Periphery installation skipped (optional)"

# Setup comprehensive remappings.txt
# Note: Foundry doesn't support comments in remappings.txt
# Only add remappings that exist to avoid errors
RUN cd hello_template && \
    echo "@openzeppelin/contracts/=lib/openzeppelin-contracts/contracts/" >> remappings.txt && \
    echo "@openzeppelin/contracts-upgradeable/=lib/openzeppelin-contracts-upgradeable/contracts/" >> remappings.txt && \
    ([ -d "lib/solmate" ] && echo "@solmate/=lib/solmate/src/" >> remappings.txt || true) && \
    ([ -d "lib/prb-math" ] && echo "@prb/math/=lib/prb-math/src/" >> remappings.txt || true) && \
    ([ -d "lib/v3-core" ] && echo "@uniswap/v3-core/=lib/v3-core/" >> remappings.txt || true) && \
    ([ -d "lib/v3-periphery" ] && echo "@uniswap/v3-periphery/=lib/v3-periphery/" >> remappings.txt || true)

# Copy and setup compilation script
COPY compile_page.sh /compile_page.sh

# Set working directory to hello_template
WORKDIR /home/user/hello_template

# Expose ports
EXPOSE 8545 3000

# Default command
CMD ["/bin/bash"]
