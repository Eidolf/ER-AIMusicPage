#!/bin/bash

# Master Pre-Flight Command
# Runs local linting and GitHub Actions simulation via act.

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${YELLOW}🚀 Initiating Pre-Flight Checks...${NC}\n"

# Resolve Project Root
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
PROJECT_ROOT="$SCRIPT_DIR/.."
cd "$PROJECT_ROOT"
# 1. Frontend Checks
echo -e "${YELLOW}► Running Frontend Linting...${NC}"
cd frontend
if npm run lint; then
    echo -e "${GREEN}✔ Frontend Lint Passed${NC}"
else
    echo -e "${RED}✘ Frontend Lint Failed${NC}"
    exit 1
fi
cd ..

# 2. Backend Checks (Placeholder - requires ensuring python env is active/available)
# echo -e "${YELLOW}► Running Backend Checks...${NC}"
# # Add backend lint commands here if needed, e.g. poetry run ruff check .

# 3. Act Simulation
echo -e "\n${YELLOW}► Starting GitHub Actions Simulation (CI Orchestrator)...${NC}"
echo "This uses Docker to simulate the CI environment. It may take a moment."

# Check for secrets
SECRETS_ARG=""
if [ -f .secrets ]; then
    if grep -q "your_docker_hub_username" .secrets; then
        echo -e "${YELLOW}⚠ .secrets file contains default placeholders. Skipping secrets injection to avoid Auth errors.${NC}"
    else
        SECRETS_ARG="--secret-file .secrets"
    fi
fi

# Run act on the specific workflow
# Using -W to point to the file, and ensuring we use a standard image that has node/python if possible, 
# though act's 'medium' image is usually sufficient.
# We skip the 'push' steps in the workflow implicitly because local act runs usually don't have permissions unless secrets are perfect, 
# but our ci-orchestrator only validates build, it doesn't push.

if act -W .github/workflows/ci-orchestrator.yml $SECRETS_ARG; then
    echo -e "\n${GREEN}✔ CI Simulation Passed${NC}"
else
    echo -e "\n${RED}✘ CI Simulation Failed${NC}"
    echo "Check the logs above for details."
    exit 1
fi

echo -e "\n${GREEN}✅ PRE-FLIGHT COMPLETE. READY TO PUSH.${NC}"
