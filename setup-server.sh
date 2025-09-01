#!/bin/bash

# Server Setup Script for Kubernetes Deployment
# This script helps prepare your server for Kubernetes deployment

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m'

echo -e "${PURPLE}╔══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${PURPLE}║${NC} ${CYAN}Server Setup for Auction Website Kubernetes Deployment${NC} ${PURPLE}║${NC}"
echo -e "${PURPLE}╚══════════════════════════════════════════════════════════════╝${NC}"

# Check if running as root
if [[ $EUID -eq 0 ]]; then
   echo -e "${RED}This script should not be run as root${NC}"
   exit 1
fi

# Check OS
if [[ "$OSTYPE" == "linux-gnu"* ]]; then
    OS="linux"
elif [[ "$OSTYPE" == "darwin"* ]]; then
    OS="macos"
else
    echo -e "${RED}Unsupported OS: $OSTYPE${NC}"
    exit 1
fi

echo -e "${BLUE}Detected OS: $OS${NC}"

# Function to install kubectl
install_kubectl() {
    echo -e "${CYAN}Installing kubectl...${NC}"
    
    if command -v kubectl &> /dev/null; then
        echo -e "${GREEN}kubectl already installed${NC}"
        kubectl version --client
        return
    fi
    
    if [[ "$OS" == "linux" ]]; then
        curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl"
        sudo install -o root -g root -m 0755 kubectl /usr/local/bin/kubectl
        rm kubectl
    elif [[ "$OS" == "macos" ]]; then
        if command -v brew &> /dev/null; then
            brew install kubectl
        else
            curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/darwin/amd64/kubectl"
            chmod +x kubectl
            sudo mv kubectl /usr/local/bin/
        fi
    fi
    
    echo -e "${GREEN}kubectl installed successfully${NC}"
}

# Function to install Docker
install_docker() {
    echo -e "${CYAN}Installing Docker...${NC}"
    
    if command -v docker &> /dev/null; then
        echo -e "${GREEN}Docker already installed${NC}"
        docker --version
        return
    fi
    
    if [[ "$OS" == "linux" ]]; then
        # Install Docker on Linux
        curl -fsSL https://get.docker.com -o get-docker.sh
        sudo sh get-docker.sh
        sudo usermod -aG docker $USER
        rm get-docker.sh
        echo -e "${YELLOW}Please log out and log back in for Docker group changes to take effect${NC}"
    elif [[ "$OS" == "macos" ]]; then
        echo -e "${YELLOW}Please install Docker Desktop for Mac from: https://www.docker.com/products/docker-desktop${NC}"
        echo -e "${YELLOW}After installation, ensure Kubernetes is enabled in Docker Desktop settings${NC}"
    fi
}

# Function to install minikube (for local development)
install_minikube() {
    echo -e "${CYAN}Do you want to install Minikube for local Kubernetes? (y/n)${NC}"
    read -p "Install Minikube: " INSTALL_MINIKUBE
    
    if [[ "$INSTALL_MINIKUBE" != "y" && "$INSTALL_MINIKUBE" != "Y" ]]; then
        return
    fi
    
    if command -v minikube &> /dev/null; then
        echo -e "${GREEN}Minikube already installed${NC}"
        minikube version
        return
    fi
    
    if [[ "$OS" == "linux" ]]; then
        curl -LO https://storage.googleapis.com/minikube/releases/latest/minikube-linux-amd64
        sudo install minikube-linux-amd64 /usr/local/bin/minikube
        rm minikube-linux-amd64
    elif [[ "$OS" == "macos" ]]; then
        if command -v brew &> /dev/null; then
            brew install minikube
        else
            curl -LO https://storage.googleapis.com/minikube/releases/latest/minikube-darwin-amd64
            sudo install minikube-darwin-amd64 /usr/local/bin/minikube
            rm minikube-darwin-amd64
        fi
    fi
    
    echo -e "${GREEN}Minikube installed successfully${NC}"
}

# Function to setup Kubernetes cluster
setup_cluster() {
    echo -e "${CYAN}Choose your Kubernetes setup:${NC}"
    echo "1. Use existing cluster (AWS EKS, GKE, AKS, etc.)"
    echo "2. Start local Minikube cluster"
    echo "3. Use Docker Desktop Kubernetes"
    echo "4. Skip cluster setup"
    
    read -p "Choice (1-4): " CLUSTER_CHOICE
    
    case $CLUSTER_CHOICE in
        1)
            echo -e "${YELLOW}Please ensure your kubectl is configured to connect to your cluster${NC}"
            echo -e "${BLUE}Test with: kubectl cluster-info${NC}"
            ;;
        2)
            echo -e "${CYAN}Starting Minikube cluster...${NC}"
            minikube start --driver=docker --memory=8192 --cpus=4
            minikube addons enable ingress
            echo -e "${GREEN}Minikube cluster started with ingress enabled${NC}"
            ;;
        3)
            echo -e "${YELLOW}Please enable Kubernetes in Docker Desktop settings${NC}"
            echo -e "${BLUE}Docker Desktop -> Settings -> Kubernetes -> Enable Kubernetes${NC}"
            ;;
        4)
            echo -e "${BLUE}Skipping cluster setup${NC}"
            ;;
        *)
            echo -e "${RED}Invalid choice${NC}"
            ;;
    esac
}

# Function to verify setup
verify_setup() {
    echo -e "${CYAN}Verifying setup...${NC}"
    
    # Check kubectl
    if command -v kubectl &> /dev/null; then
        echo -e "${GREEN}✓ kubectl is installed${NC}"
        
        # Check cluster connectivity
        if kubectl cluster-info &> /dev/null; then
            echo -e "${GREEN}✓ Connected to Kubernetes cluster${NC}"
            kubectl get nodes
        else
            echo -e "${YELLOW}⚠ Cannot connect to Kubernetes cluster${NC}"
        fi
    else
        echo -e "${RED}✗ kubectl not found${NC}"
    fi
    
    # Check Docker
    if command -v docker &> /dev/null; then
        echo -e "${GREEN}✓ Docker is installed${NC}"
        if docker ps &> /dev/null; then
            echo -e "${GREEN}✓ Docker daemon is running${NC}"
        else
            echo -e "${YELLOW}⚠ Docker daemon not running${NC}"
        fi
    else
        echo -e "${RED}✗ Docker not found${NC}"
    fi
}

# Main execution
main() {
    echo -e "${BLUE}Starting server setup...${NC}"
    
    # Install components
    install_kubectl
    install_docker
    install_minikube
    
    # Setup cluster
    setup_cluster
    
    # Verify setup
    verify_setup
    
    echo -e "${GREEN}Server setup completed!${NC}"
    echo
    echo -e "${CYAN}Next steps:${NC}"
    echo -e "1. Navigate to k8s directory: ${YELLOW}cd k8s${NC}"
    echo -e "2. Configure deployment: ${YELLOW}./configure-deployment.sh${NC}"
    echo -e "3. Deploy application: ${YELLOW}./deploy-all.sh${NC}"
    echo
    echo -e "${PURPLE}For detailed instructions, see: DEPLOYMENT-GUIDE.md${NC}"
}

# Run main function
main
