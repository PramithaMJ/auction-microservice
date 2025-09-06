# Auction Microservice Helm Chart

This Helm chart deploys the Auction Microservice application on a Kubernetes cluster.

## Prerequisites

- Kubernetes 1.16+
- Helm 3.0+
- PV provisioner support in the underlying infrastructure
- Ingress controller (if ingress is enabled)

## Installing the Chart

To install the chart with the release name `my-auction`:

```bash
helm install my-auction ./helm-charts
```

## Configuration

The following table lists the configurable parameters of the Auction Microservice chart and their default values.

### Global Parameters

| Parameter | Description | Default |
|-----------|-------------|---------|
| `global.environment` | Environment name | `production` |
| `global.imageRegistry` | Global Docker image registry | `""` |
| `global.imagePullPolicy` | Global Docker image pull policy | `IfNotPresent` |

### Infrastructure Parameters

| Parameter | Description | Default |
|-----------|-------------|---------|
| `infrastructure.mysql.enabled` | Enable MySQL databases | `true` |
| `infrastructure.mysql.storageClass` | Storage class for MySQL PVC | `standard` |
| `infrastructure.redis.enabled` | Enable Redis | `true` |
| `infrastructure.nats.enabled` | Enable NATS Streaming | `true` |
| `infrastructure.jaeger.enabled` | Enable Jaeger tracing | `true` |

### Service Parameters

Each service (api-gateway, auth, bid, etc.) supports the following parameters:

| Parameter | Description | Default |
|-----------|-------------|---------|
| `services.<service>.name` | Service name | `<service>` |
| `services.<service>.image.repository` | Image repository | `<service>` |
| `services.<service>.image.tag` | Image tag | `latest` |
| `services.<service>.replicas` | Number of replicas | `1` |

## Uninstalling the Chart

To uninstall/delete the `my-auction` deployment:

```bash
helm delete my-auction
```

## Notes

- The chart deploys multiple microservices and their dependencies
- MySQL databases use persistent storage
- Ingress configuration is included but disabled by default
- Jaeger is included for distributed tracing
