# VPA Monitoring Setup

This setup provides Prometheus and Grafana monitoring for VPA (Vertical Pod Autoscaler) recommendations in your auction microservice.

## Components

1. **Prometheus** - Metrics collection and storage
2. **Grafana** - Dashboard and visualization
3. **Kube State Metrics** - Exposes VPA metrics to Prometheus

## Deployment

Deploy the monitoring stack:

```bash
# Apply all monitoring components
kubectl apply -f k8s/monitoring/kube-state-metrics.yaml
kubectl apply -f k8s/monitoring/prometheus.yaml
kubectl apply -f k8s/monitoring/grafana.yaml

# Update ingress to include monitoring endpoints
kubectl apply -f k8s/ingress/auction-ingress.yaml
```

## Access

- **Grafana**: `http://your-domain.com/grafana`
  - Username: `admin`
  - Password: `admin`
- **Prometheus**: `http://your-domain.com/prometheus`

## VPA Data Access

### Via Grafana Dashboard

- Login to Grafana at `/grafana`
- Navigate to the "VPA Recommendations" dashboard
- View CPU and Memory recommendations for all VPAs

### Via kubectl (Direct)

```bash
# Get VPA recommendations for a specific VPA
kubectl get vpa api-gateway-vpa -n auction-system -o yaml

# Get all VPA recommendations
kubectl get vpa -n auction-system -o yaml
```

### Via Prometheus Queries

Access Prometheus at `/prometheus` and use these queries:

```promql
# CPU recommendations
kube_verticalpodautoscaler_status_recommendation_containerrecommendations_target{resource="cpu"}

# Memory recommendations
kube_verticalpodautoscaler_status_recommendation_containerrecommendations_target{resource="memory"}

# VPA update mode
kube_verticalpodautoscaler_spec_updatepolicy_updatemode
```

## Configuration Notes

- VPAs are configured with `updateMode: "Off"` to provide recommendations only
- Prometheus scrapes VPA metrics via kube-state-metrics
- Simple authentication (admin/admin) - change in production
- All components run in the `auction-system` namespace
