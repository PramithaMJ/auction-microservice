# Auto-scaling Configuration for Auction Microservice

This directory contains both Horizontal Pod Autoscaler (HPA) and Vertical Pod Autoscaler (VPA) configurations for the auction microservice system.

## Files

- `hpa.yaml` - Horizontal Pod Autoscaler configurations
- `vpa.yaml` - Vertical Pod Autoscaler configurations

## HPA vs VPA Conflict Prevention

To prevent conflicts between HPA and VPA, the VPA configurations are set with `updateMode: "Off"`. This means:

- **HPA**: Actively scales the number of pods based on CPU utilization
- **VPA**: Provides resource recommendations without automatically updating pods

## How it Works

### Horizontal Pod Autoscaler (HPA)

- Automatically scales the number of pod replicas based on CPU utilization
- Targets different CPU thresholds for different services
- Handles traffic spikes by adding more pods

### Vertical Pod Autoscaler (VPA)

- Analyzes resource usage patterns and provides recommendations
- Helps optimize resource requests and limits for better resource utilization
- Does not automatically update pods (updateMode: "Off") to avoid conflicts with HPA

## Deployment

### Prerequisites

Make sure VPA is installed in your cluster:

```bash
# For EKS clusters, VPA needs to be installed
kubectl apply -f https://github.com/kubernetes/autoscaler/releases/latest/download/vpa-release-0.9.yaml
```

### Deploy Auto-scaling Configurations

```bash
# Deploy HPA
kubectl apply -f hpa.yaml

# Deploy VPA
kubectl apply -f vpa.yaml
```

## Monitoring VPA Recommendations

To view VPA recommendations:

```bash
# List all VPAs
kubectl get vpa -n auction-system

# Get detailed recommendations for a specific service
kubectl describe vpa api-gateway-vpa -n auction-system

# View recommendations for all services
kubectl get vpa -n auction-system -o jsonpath='{range .items[*]}{.metadata.name}{"\n"}{.status.recommendation.containerRecommendations[0]}{"\n\n"}{end}'
```

## Using VPA Recommendations

1. Monitor the VPA recommendations over time
2. Update your deployment resource requests/limits based on the recommendations
3. This will help optimize resource utilization and reduce costs

## Best Practices

1. **Start with updateMode: "Off"** - Always start with recommendation mode to understand the patterns
2. **Monitor for at least a week** - Let VPA collect sufficient data before making decisions
3. **Apply recommendations gradually** - Don't apply all recommendations at once
4. **Test in staging first** - Always test resource changes in a staging environment

## Switching to Auto-Update Mode (Advanced)

If you want VPA to automatically update resources (after thorough testing), you can change:

```yaml
updatePolicy:
  updateMode: 'Auto' # or "Initial" for new pods only
```

**Warning**: Only do this after disabling HPA or carefully testing to ensure they don't conflict.

## Resource Limits Explanation

The VPA configurations include both `minAllowed` and `maxAllowed` values:

- **minAllowed**: Prevents VPA from recommending resources below this threshold
- **maxAllowed**: Prevents VPA from recommending resources above this threshold

These limits are set based on:

- Service criticality (API Gateway and Bid service have higher limits)
- Expected load patterns
- Cost optimization considerations
