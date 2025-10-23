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

# Install OpenZeppelin using your preferred method (Approach #1)
RUN export PATH="$PATH:$HOME/.foundry/bin" && \
    cd hello_template && \
    forge install OpenZeppelin/openzeppelin-contracts@v5.0.0

# Setup remappings.txt
RUN cd hello_template && echo "@openzeppelin/contracts/=lib/openzeppelin-contracts/contracts/" >> remappings.txt

# Copy and setup compilation script
COPY compile_page.sh /compile_page.sh

# Set working directory to hello_template
WORKDIR /home/user/hello_template

# Expose ports
EXPOSE 8545 3000

# Default command
CMD ["/bin/bash"]
