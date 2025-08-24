# Docker Repository Migration Guide

## 🔄 Repository Naming Change

We've updated the Docker repository naming convention to fix CI/CD deployment issues:

### Old Format (❌ Deprecated)
```
pramithamj/auction-website/service-name
```

### New Format (✅ Current)
```
pramithamj/auction-website-ms-service-name
```

## 🎯 Why This Change?

The old format `auction-website/service` was causing push access denied errors because:
- Docker Hub requires flat repository names (no nested paths)
- Some registries don't support the `/` character in repository names
- CI/CD workflows need consistent, valid repository names

## 🚀 Quick Migration

### Automated Migration (Recommended)
```bash
./migrate-docker-repos.sh
```

This script provides options to:
1. Tag existing local images with new names
2. Pull and retag images from registry
3. Check current image status
4. Clean up old tags

### Manual Migration
```bash
# Tag existing images
docker tag pramithamj/auction-website/auth:latest pramithamj/auction-website-ms-auth:latest
docker tag pramithamj/auction-website/bid:latest pramithamj/auction-website-ms-bid:latest
# ... repeat for all services

# Push with new names
docker push pramithamj/auction-website-ms-auth:latest
docker push pramithamj/auction-website-ms-bid:latest
# ... repeat for all services
```

## 📋 Complete Service Mapping

| Old Repository | New Repository |
|----------------|----------------|
| `auction-website/api-gateway` | `auction-website-ms-api-gateway` |
| `auction-website/auth` | `auction-website-ms-auth` |
| `auction-website/bid` | `auction-website-ms-bid` |
| `auction-website/listing` | `auction-website-ms-listing` |
| `auction-website/payment` | `auction-website-ms-payment` |
| `auction-website/profile` | `auction-website-ms-profile` |
| `auction-website/email` | `auction-website-ms-email` |
| `auction-website/expiration` | `auction-website-ms-expiration` |
| `auction-website/frontend` | `auction-website-ms-frontend` |
| `auction-website/common` | `auction-website-ms-common` |

## 🔧 Updated Files

The following files have been updated with the new naming convention:

### Docker Compose Files
- ✅ `docker-compose.yml`
- ✅ `docker-compose.pull-only.yml`

### Build Scripts
- ✅ `scripts/build-all.sh`
- ✅ `scripts/push-all.sh`
- ✅ `scripts/deploy.sh`

### CI/CD Workflows
- ✅ `.github/workflows/ci.yml`
- ✅ `.github/workflows/production-ci.yml`

## 🧪 Testing Your Setup

### 1. Verify Docker Compose Configuration
```bash
docker-compose config
```

### 2. Test Build Process
```bash
./scripts/build-all.sh
```

### 3. Test Push Process
```bash
./scripts/push-all.sh
```

### 4. Check Images
```bash
docker images | grep auction-website-ms
```

## 🔍 Troubleshooting

### Images Not Found
If you get "image not found" errors:
```bash
# Run the migration script
./migrate-docker-repos.sh

# Or manually pull/build images
./scripts/build-all.sh
```

### Push Access Denied
Ensure you're logged into Docker Hub:
```bash
docker login
```

### CI/CD Pipeline Errors
Check that your GitHub repository secrets include:
- `DOCKER_USERNAME`
- `DOCKER_PASSWORD`

## 📚 Environment Variables

No changes needed for environment variables. The following still work:
- `DOCKER_USERNAME` - Your Docker Hub username
- `IMAGE_TAG` - Version tag for images

## ✅ Migration Checklist

- [ ] Run migration script: `./migrate-docker-repos.sh`
- [ ] Test Docker Compose: `docker-compose config`
- [ ] Build new images: `./scripts/build-all.sh`
- [ ] Push to registry: `./scripts/push-all.sh`
- [ ] Test deployment: `docker-compose up -d`
- [ ] Verify CI/CD pipeline works
- [ ] Clean up old images (optional)

## 🎉 Benefits

✅ **Fixed CI/CD Deployment** - No more push access denied errors  
✅ **Registry Compatibility** - Works with all Docker registries  
✅ **Cleaner Naming** - More explicit microservice naming  
✅ **Better Organization** - Easier to identify auction-related services  

The new naming convention ensures reliable deployments and better compatibility with Docker registries!
