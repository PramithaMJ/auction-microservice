# VPA Monitoring Stack Deployment Guide

# Complete Prometheus and Grafana setup for VPA recommendations monitoring

## Overview

This monitoring stack provides comprehensive visibility into Vertical Pod Autoscaler (VPA) recommendations and resource utilization across the auction microservice system.

## Components Deployed

1. **Prometheus** - Metrics collection and storage
2. **Grafana** - Visualization and dashboards
3. **Kube State Metrics** - Kubernetes object metrics
4. **VPA Recommender** - Enhanced VPA with metrics exposure
5. **AlertManager** - Alert routing and notifications
6. **Node Exporter** - Node-level metrics

## Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   VPA Objects   │───▶│   Kube State     │───▶│   Prometheus    │
│  (auction-sys)  │    │   Metrics        │    │                 │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                                                         │
┌─────────────────┐    ┌──────────────────┐             ▼
│  Node Metrics   │───▶│  Node Exporter   │    ┌─────────────────┐
│                 │    │                  │    │   AlertManager  │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                                                         │
┌─────────────────┐    ┌──────────────────┐             ▼
│ VPA Recommender │───▶│   Pod Metrics    │    ┌─────────────────┐
│                 │    │                  │    │    Grafana      │
└─────────────────┘    └──────────────────┘    │   Dashboards    │
                                               └─────────────────┘
```

## Deployment Order

### 1. Deploy Infrastructure Components

```bash
# Deploy monitoring namespace (if not exists)
kubectl apply -f k8s/namespaces.yaml

# Deploy Prometheus
kubectl apply -f k8s/monitoring/prometheus.yaml

# Deploy Kube State Metrics
kubectl apply -f k8s/monitoring/kube-state-metrics.yaml

# Deploy Node Exporter
kubectl apply -f k8s/monitoring/node-exporter.yaml
```

### 2. Deploy VPA Components

```bash
# Deploy enhanced VPA Recommender
kubectl apply -f k8s/monitoring/vpa-recommender.yaml
```

### 3. Deploy Visualization and Alerting

```bash
# Deploy Grafana with dashboards
kubectl apply -f k8s/monitoring/grafana.yaml
kubectl apply -f k8s/monitoring/additional-dashboards.yaml

# Deploy AlertManager
kubectl apply -f k8s/monitoring/alertmanager.yaml

# Deploy Service Monitors (if using Prometheus Operator)
kubectl apply -f k8s/monitoring/service-monitors.yaml
```

### 4. Deploy Ingress

```bash
# Deploy monitoring ingress
kubectl apply -f k8s/ingress/monitoring-ingress.yaml
```

## Accessing the Monitoring Stack

### Grafana Dashboard

- **URL**: `http://a7503495282ca40048d4d48a88dc59cb-616686098.us-east-2.elb.amazonaws.com/grafana`
- **Username**: `admin`
- **Password**: `admin123`

### Available Dashboards

1. **VPA Monitoring Dashboard** - Main VPA recommendations view
2. **Resource Utilization & Optimization** - Resource efficiency analysis
3. **Auction Services Performance** - Service-specific metrics

### Prometheus Access (Debug)

- **URL**: `http://a7503495282ca40048d4d48a88dc59cb-616686098.us-east-2.elb.amazonaws.com/prometheus`

## Key Metrics Monitored

### VPA Metrics

- `kube_verticalpodautoscaler_status_recommendation` - VPA recommendations
- `vpa_recommender_recommendation_duration_seconds` - Recommendation latency
- `vpa_recommender_aggregated_memory_usage_samples` - Memory usage samples

### Resource Metrics

- `container_cpu_usage_seconds_total` - Current CPU usage
- `container_memory_usage_bytes` - Current memory usage
- `kube_pod_container_resource_requests` - Current resource requests
- `kube_pod_container_resource_limits` - Current resource limits

### Alert Rules

- **VPAHighCPURecommendation** - CPU recommendation > 1 core
- **VPAHighMemoryRecommendation** - Memory recommendation > 2GB
- **VPAUnderProvisionedCPU** - Recommendation 50% higher than allocation
- **VPAUnderProvisionedMemory** - Memory recommendation 50% higher than allocation
- **VPAOverProvisionedCPU** - Recommendation 50% lower than allocation
- **VPAOverProvisionedMemory** - Memory recommendation 50% lower than allocation

## Dashboard Features

### 1. VPA Monitoring Dashboard

- Real-time VPA recommendations for CPU and memory
- Current resource usage vs recommendations
- VPA recommendations summary table
- Historical trends and patterns

### 2. Resource Utilization Dashboard

- Recommendation vs request ratios
- Resource provisioning status indicators
- Efficiency metrics and optimization opportunities

### 3. Auction Services Dashboard

- Service-specific CPU and memory usage
- VPA recommendations per microservice
- Performance correlation with resource allocation

## Troubleshooting

### Common Issues

1. **VPA Metrics Not Available**

   - Ensure VPA CRDs are installed: `kubectl get crd verticalpodautoscalers.autoscaling.k8s.io`
   - Check VPA recommender logs: `kubectl logs -n kube-system deployment/vpa-recommender`

2. **Prometheus Not Scraping VPA Metrics**

   - Verify service discovery: Check Prometheus targets page
   - Ensure proper RBAC permissions for VPA resources

3. **Grafana Dashboard Empty**
   - Verify Prometheus datasource connection
   - Check if metrics are available in Prometheus
   - Ensure correct namespace filtering

### Validation Commands

```bash
# Check if all monitoring components are running
kubectl get pods -n auction-infrastructure

# Verify VPA objects exist
kubectl get vpa -n auction-system

# Check Prometheus targets
kubectl port-forward -n auction-infrastructure svc/prometheus 9090:9090
# Visit http://localhost:9090/targets

# Check Grafana
kubectl port-forward -n auction-infrastructure svc/grafana 3000:3000
# Visit http://localhost:3000
```

## Configuration Customization

### Modifying Alert Thresholds

Edit `k8s/monitoring/alertmanager.yaml` and update the PrometheusRule section:

```yaml
- alert: VPAHighCPURecommendation
  expr: kube_verticalpodautoscaler_status_recommendation{resource="cpu"} > 2 # Change threshold
```

### Adding Custom Dashboards

1. Export dashboard JSON from Grafana
2. Create new ConfigMap in `k8s/monitoring/additional-dashboards.yaml`
3. Mount in Grafana deployment

### Modifying Retention

Update Prometheus deployment args:

```yaml
- '--storage.tsdb.retention.time=30d' # Increase retention
```

## Performance Considerations

### Resource Requirements

- **Prometheus**: 1 CPU, 2GB RAM, 20GB storage
- **Grafana**: 500m CPU, 1GB RAM, 10GB storage
- **Kube State Metrics**: 200m CPU, 400MB RAM
- **Node Exporter**: 200m CPU, 200MB RAM per node

### Scaling Recommendations

- For large clusters (>100 nodes), consider Prometheus federation
- Use recording rules for frequently accessed queries
- Implement metric cardinality limits

## Security Considerations

### Network Policies

Consider implementing network policies to restrict access:

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: monitoring-network-policy
  namespace: auction-infrastructure
spec:
  podSelector:
    matchLabels:
      app: grafana
  policyTypes:
    - Ingress
  ingress:
    - from:
        - namespaceSelector:
            matchLabels:
              name: auction-system
```

### Authentication

For production, consider:

- OAuth integration for Grafana
- Basic auth for Prometheus
- TLS termination at ingress level

## Maintenance

### Regular Tasks

1. **Weekly**: Review alert noise and tune thresholds
2. **Monthly**: Analyze VPA recommendation trends
3. **Quarterly**: Review resource allocation efficiency

### Backup

- Export Grafana dashboards regularly
- Backup Prometheus data if long-term retention needed
- Document custom configurations

## Integration with CI/CD

The monitoring stack integrates with the existing auction microservice deployment without requiring separate ArgoCD applications. All manifests follow the same namespace and labeling conventions as the existing infrastructure.
