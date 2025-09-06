# VPA Monitoring Stack - Fixed Deployment

## Issue Resolution
The original deployment failed because it included Prometheus Operator CRDs (ServiceMonitor, PrometheusRule) which are not available in a standard Kubernetes cluster. This has been fixed by:

1. **Removed ServiceMonitor resources** - Replaced with native Kubernetes service discovery
2. **Removed PrometheusRule resources** - Moved alert rules to Prometheus ConfigMap
3. **Updated Prometheus configuration** - Added proper service discovery for all components

## Fixed Deployment Order

```bash
# 1. Deploy core monitoring stack
kubectl apply -f k8s/monitoring/prometheus.yaml
kubectl apply -f k8s/monitoring/kube-state-metrics.yaml
kubectl apply -f k8s/monitoring/node-exporter.yaml

# 2. Deploy VPA recommender with metrics
kubectl apply -f k8s/monitoring/vpa-recommender.yaml

# 3. Deploy visualization and alerting
kubectl apply -f k8s/monitoring/grafana.yaml
kubectl apply -f k8s/monitoring/additional-dashboards.yaml
kubectl apply -f k8s/monitoring/alertmanager.yaml

# 4. Deploy ingress for external access
kubectl apply -f k8s/ingress/monitoring-ingress.yaml
```

## What Was Fixed

### 1. Prometheus Configuration
- ✅ Added AlertManager integration
- ✅ Fixed service discovery for all components
- ✅ Moved alert rules from PrometheusRule to ConfigMap
- ✅ Added proper metric collection for VPA objects

### 2. Removed Operator Dependencies
- ❌ Deleted `service-monitors.yaml` (contained ServiceMonitor CRDs)
- ✅ Used native Kubernetes service discovery instead
- ✅ Integrated alert rules directly into Prometheus config

### 3. Service Discovery
The Prometheus now discovers targets using:
- **kubernetes-pods**: For pod-level metrics with annotations
- **kubernetes-nodes**: For node metrics via kubelet
- **kubernetes-cadvisor**: For container metrics
- **kube-state-metrics**: For Kubernetes object metrics (including VPA)
- **vpa-recommender**: For VPA recommendation metrics
- **node-exporter**: For detailed node metrics

## Verification Commands

```bash
# Check if all pods are running
kubectl get pods -n auction-infrastructure

# Check if VPA objects are being monitored
kubectl get vpa -n auction-system

# Access Grafana (after port-forward or via ingress)
kubectl port-forward -n auction-infrastructure svc/grafana 3000:3000

# Access Prometheus to verify targets
kubectl port-forward -n auction-infrastructure svc/prometheus 9090:9090
# Then visit http://localhost:9090/targets
```

## Expected Metrics

Once deployed, Prometheus should collect:
- `kube_verticalpodautoscaler_status_recommendation` - VPA recommendations
- `container_cpu_usage_seconds_total` - CPU usage
- `container_memory_usage_bytes` - Memory usage
- `kube_pod_container_resource_requests` - Resource requests
- `kube_pod_container_resource_limits` - Resource limits

## Access URLs

After deployment:
- **Grafana**: `http://a7503495282ca40048d4d48a88dc59cb-616686098.us-east-2.elb.amazonaws.com/grafana`
- **Prometheus**: `http://a7503495282ca40048d4d48a88dc59cb-616686098.us-east-2.elb.amazonaws.com/prometheus`
- **Credentials**: admin/admin123 (Grafana)

## Troubleshooting

If you still see CRD-related errors:
1. Ensure no ServiceMonitor or PrometheusRule resources exist
2. Check Prometheus logs for service discovery issues
3. Verify RBAC permissions for VPA resources
4. Confirm VPA CRDs are installed in the cluster
