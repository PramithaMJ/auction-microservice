# Makefile for Auction Website Kubernetes Deployment
# Usage: make <target> [ENVIRONMENT=development|staging|production]

# Default environment
ENVIRONMENT ?= development

# Colors for output
GREEN = \033[0;32m
YELLOW = \033[1;33m
BLUE = \033[0;34m
NC = \033[0m # No Color

.PHONY: help deploy status clean test dry-run build-manifest logs scale restart

# Default target
.DEFAULT_GOAL := help

## Display this help message
help:
	@echo "$(BLUE)Auction Website Kubernetes Deployment$(NC)"
	@echo "$(BLUE)======================================$(NC)"
	@echo ""
	@echo "$(GREEN)Available targets:$(NC)"
	@echo ""
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "  $(YELLOW)%-20s$(NC) %s\n", $$1, $$2}'
	@echo ""
	@echo "$(GREEN)Examples:$(NC)"
	@echo "  make deploy                           # Deploy to development"
	@echo "  make deploy ENVIRONMENT=production    # Deploy to production"
	@echo "  make status ENVIRONMENT=staging       # Check staging status"
	@echo "  make clean ENVIRONMENT=development    # Clean development"
	@echo ""

## Deploy the auction website to specified environment
deploy:
	@echo "$(GREEN)Deploying to $(ENVIRONMENT) environment...$(NC)"
	./deploy-kustomize.sh -e $(ENVIRONMENT)

## Deploy with force flag (recreate resources)
deploy-force:
	@echo "$(GREEN)Force deploying to $(ENVIRONMENT) environment...$(NC)"
	./deploy-kustomize.sh -e $(ENVIRONMENT) -f

## Show deployment status
status:
	@echo "$(GREEN)Checking status for $(ENVIRONMENT) environment...$(NC)"
	./status-enhanced.sh -e $(ENVIRONMENT)

## Show detailed status with resource usage
status-detailed:
	@echo "$(GREEN)Checking detailed status for $(ENVIRONMENT) environment...$(NC)"
	./status-enhanced.sh -e $(ENVIRONMENT) -d

## Watch status continuously
watch:
	@echo "$(GREEN)Watching status for $(ENVIRONMENT) environment...$(NC)"
	./status-enhanced.sh -e $(ENVIRONMENT) -w

## Clean up deployment (with confirmation)
clean:
	@echo "$(YELLOW)Cleaning $(ENVIRONMENT) environment...$(NC)"
	./cleanup-kustomize.sh -e $(ENVIRONMENT)

## Force clean up deployment (no confirmation)
clean-force:
	@echo "$(YELLOW)Force cleaning $(ENVIRONMENT) environment...$(NC)"
	./cleanup-kustomize.sh -e $(ENVIRONMENT) -f

## Clean up including persistent data (DANGEROUS!)
clean-all:
	@echo "$(YELLOW)Cleaning $(ENVIRONMENT) environment including data...$(NC)"
	./cleanup-kustomize.sh -e $(ENVIRONMENT) -p

## Perform dry run to see what would be deployed
dry-run:
	@echo "$(GREEN)Performing dry run for $(ENVIRONMENT) environment...$(NC)"
	./deploy-kustomize.sh -e $(ENVIRONMENT) -d

## Build manifest without applying
build-manifest:
	@echo "$(GREEN)Building manifest for $(ENVIRONMENT) environment...$(NC)"
	kubectl kustomize overlays/$(ENVIRONMENT)

## Show logs for a specific service (use SERVICE=service-name)
logs:
	@if [ -z "$(SERVICE)" ]; then \
		echo "$(YELLOW)Please specify SERVICE. Example: make logs SERVICE=api-gateway$(NC)"; \
		echo "$(GREEN)Available services:$(NC)"; \
		kubectl get deployments -n auction-system --no-headers | awk '{print "  " $$1}'; \
	else \
		echo "$(GREEN)Showing logs for $(SERVICE)...$(NC)"; \
		./status-enhanced.sh -l $(SERVICE); \
	fi

## Scale a service (use SERVICE=service-name REPLICAS=number)
scale:
	@if [ -z "$(SERVICE)" ] || [ -z "$(REPLICAS)" ]; then \
		echo "$(YELLOW)Please specify SERVICE and REPLICAS. Example: make scale SERVICE=api-gateway REPLICAS=3$(NC)"; \
	else \
		echo "$(GREEN)Scaling $(SERVICE) to $(REPLICAS) replicas...$(NC)"; \
		kubectl scale deployment $(SERVICE) --replicas=$(REPLICAS) -n auction-system; \
	fi

## Restart a service (use SERVICE=service-name)
restart:
	@if [ -z "$(SERVICE)" ]; then \
		echo "$(YELLOW)Please specify SERVICE. Example: make restart SERVICE=api-gateway$(NC)"; \
		echo "$(GREEN)Available services:$(NC)"; \
		kubectl get deployments -n auction-system --no-headers | awk '{print "  " $$1}'; \
	else \
		echo "$(GREEN)Restarting $(SERVICE)...$(NC)"; \
		kubectl rollout restart deployment/$(SERVICE) -n auction-system; \
		kubectl rollout status deployment/$(SERVICE) -n auction-system; \
	fi

## Run tests against the deployment
test:
	@echo "$(GREEN)Running tests against $(ENVIRONMENT) environment...$(NC)"
	@echo "$(YELLOW)Testing API Gateway health...$(NC)"
	@kubectl exec -n auction-system deployment/api-gateway -- curl -f http://localhost:3001/health || echo "API Gateway health check failed"
	@echo "$(YELLOW)Testing Auth service...$(NC)"
	@kubectl exec -n auction-system deployment/auth -- curl -f http://localhost:3101/health || echo "Auth service health check failed"
	@echo "$(GREEN)Basic tests completed$(NC)"

## Port forward API Gateway for local access
port-forward:
	@echo "$(GREEN)Port forwarding API Gateway to localhost:3001...$(NC)"
	@echo "$(YELLOW)Access the API at http://localhost:3001$(NC)"
	@echo "$(YELLOW)Press Ctrl+C to stop port forwarding$(NC)"
	kubectl port-forward service/api-gateway-service 3001:3001 -n auction-system

## Port forward Frontend for local access
port-forward-frontend:
	@echo "$(GREEN)Port forwarding Frontend to localhost:3000...$(NC)"
	@echo "$(YELLOW)Access the application at http://localhost:3000$(NC)"
	@echo "$(YELLOW)Press Ctrl+C to stop port forwarding$(NC)"
	kubectl port-forward service/frontend-service 3000:3000 -n auction-system

## Show resource usage
resources:
	@echo "$(GREEN)Resource usage for $(ENVIRONMENT) environment:$(NC)"
	@echo "$(BLUE)Nodes:$(NC)"
	@kubectl top nodes 2>/dev/null || echo "Metrics server not available"
	@echo ""
	@echo "$(BLUE)Pods in auction-system:$(NC)"
	@kubectl top pods -n auction-system 2>/dev/null || echo "Metrics server not available"
	@echo ""
	@echo "$(BLUE)Pods in auction-infrastructure:$(NC)"
	@kubectl top pods -n auction-infrastructure 2>/dev/null || echo "Metrics server not available"

## Show all services and their external access points
endpoints:
	@echo "$(GREEN)Service endpoints for $(ENVIRONMENT) environment:$(NC)"
	@echo "$(BLUE)Services in auction-system:$(NC)"
	@kubectl get services -n auction-system
	@echo ""
	@echo "$(BLUE)Ingress:$(NC)"
	@kubectl get ingress -n auction-system 2>/dev/null || echo "No ingress found"

## Quick deployment check
check:
	@echo "$(GREEN)Quick deployment check for $(ENVIRONMENT) environment:$(NC)"
	@echo "$(BLUE)Application pods:$(NC)"
	@kubectl get pods -n auction-system --no-headers | awk '{if($$3=="Running") print "✓ " $$1; else print "✗ " $$1 " (" $$3 ")"}'
	@echo ""
	@echo "$(BLUE)Infrastructure pods:$(NC)"
	@kubectl get pods -n auction-infrastructure --no-headers | awk '{if($$3=="Running") print "✓ " $$1; else print "✗ " $$1 " (" $$3 ")"}'

## Show deployment events
events:
	@echo "$(GREEN)Recent events for $(ENVIRONMENT) environment:$(NC)"
	@echo "$(BLUE)Events in auction-system:$(NC)"
	@kubectl get events -n auction-system --sort-by='.lastTimestamp' | tail -10
	@echo ""
	@echo "$(BLUE)Events in auction-infrastructure:$(NC)"
	@kubectl get events -n auction-infrastructure --sort-by='.lastTimestamp' | tail -10

## Apply only infrastructure components
deploy-infra:
	@echo "$(GREEN)Deploying infrastructure for $(ENVIRONMENT) environment...$(NC)"
	kubectl apply -f 00-namespace.yaml
	kubectl apply -f secrets/
	kubectl apply -f configmaps/
	kubectl apply -f infrastucture/

## Apply only application components
deploy-apps:
	@echo "$(GREEN)Deploying applications for $(ENVIRONMENT) environment...$(NC)"
	kubectl apply -f deployments/
	kubectl apply -f ingress/

## Create a new environment overlay
create-env:
	@if [ -z "$(ENV_NAME)" ]; then \
		echo "$(YELLOW)Please specify ENV_NAME. Example: make create-env ENV_NAME=my-env$(NC)"; \
	else \
		echo "$(GREEN)Creating environment overlay: $(ENV_NAME)$(NC)"; \
		mkdir -p overlays/$(ENV_NAME); \
		cp overlays/development/kustomization.yaml overlays/$(ENV_NAME)/; \
		cp overlays/development/dev-resources.yaml overlays/$(ENV_NAME)/$(ENV_NAME)-resources.yaml; \
		sed -i '' 's/development/$(ENV_NAME)/g' overlays/$(ENV_NAME)/kustomization.yaml; \
		sed -i '' 's/dev-resources.yaml/$(ENV_NAME)-resources.yaml/g' overlays/$(ENV_NAME)/kustomization.yaml; \
		echo "$(GREEN)Environment overlay created at overlays/$(ENV_NAME)$(NC)"; \
	fi

## Show available make targets
targets:
	@make help
