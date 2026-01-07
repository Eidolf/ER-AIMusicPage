#!/bin/bash

# Setup Script for Local CI (Pre-Flight)
# Verifies Docker, Act, and Secrets configuration.

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${YELLOW}Starting Local CI Setup Check...${NC}"

# Resolve Project Root
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
PROJECT_ROOT="$SCRIPT_DIR/.."
cd "$PROJECT_ROOT"

# 1. Check Docker
if ! command -v docker &> /dev/null; then
    echo -e "${RED}[FAIL] Docker is not installed.${NC}"
    echo "Please install Docker Desktop or Docker Engine."
    exit 1
fi

if ! docker info &> /dev/null; then
    echo -e "${RED}[FAIL] Docker is installed but not running or permission denied.${NC}"
    echo "Please start Docker or check permissions."
    exit 1
fi
echo -e "${GREEN}[PASS] Docker is running.${NC}"

# 2. Check Act
if ! command -v act &> /dev/null; then
    echo -e "${RED}[FAIL] 'act' is not installed.${NC}"
    echo "Please install act (e.g., brew install act, winget install nektos.act)."
    exit 1
fi
echo -e "${GREEN}[PASS] 'act' is installed ($(act --version)).${NC}"

# 3. Check Secrets
if [ ! -f .secrets ]; then
    echo -e "${YELLOW}[WARN] .secrets file not found.${NC}"
    if [ -f .secrets.example ]; then
        echo "Creating .secrets from .secrets.example..."
        cp .secrets.example .secrets
        echo -e "${GREEN}[DONE] Created .secrets. Please edit it with your real credentials if needed.${NC}"
    else
        echo -e "${RED}[FAIL] .secrets.example not found. Cannot create .secrets template.${NC}"
    fi
else
    echo -e "${GREEN}[PASS] .secrets file exists.${NC}"
fi

echo -e "\n${GREEN}Setup Complete! You are ready to run ./scripts/preflight.sh${NC}"
