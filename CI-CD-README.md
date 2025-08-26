# CI/CD Pipeline Setup

## GitHub Actions CI Pipeline

Your CI/CD pipeline has been set up to automatically build and push Docker images to Docker Hub when you commit to the main branch.

### What it does:

1. **Triggers**: Runs on every push to `main` branch and pull requests
2. **Builds**: All microservices (auth, bid, listings, payments, profile, email, expiration, api-gateway, frontend) + common package
3. **Tags**: Creates multiple tags for each image:
   - `latest` - Always the latest main branch
   - `v1.0.{build_number}` - Incremental version
   - `v1.0.{build_number}-{commit_sha}` - Full version with commit

### Setup Steps:

#### 1. Set up GitHub Secrets
Go to your GitHub repository → Settings → Secrets and variables → Actions, and add:

- `DOCKER_USERNAME`: Your Docker Hub username (`pramithamj`)
- `DOCKER_PASSWORD`: Your Docker Hub access token (not password!)

#### 2. Create Docker Hub Access Token
1. Go to Docker Hub → Account Settings → Security
2. Click "New Access Token"
3. Give it a name like "GitHub Actions"
4. Copy the token and use it as `DOCKER_PASSWORD` secret

#### 3. Commit and Push
```bash
git add .github/
git commit -m "Add CI/CD pipeline"
git push origin main
```

### Usage:

#### Monitor Pipeline
- Go to GitHub → Actions tab
- Watch the pipeline run
- Each successful run will push images to Docker Hub

#### Use Specific Versions
To use a specific version in your docker-compose:

```bash
# Set specific version
export IMAGE_TAG=v1.0.123

# Run with specific version
docker-compose up -d
```

#### Local Testing
Use the build script to test builds locally before pushing:

```bash
chmod +x scripts/build-all.sh
./scripts/build-all.sh
```

### Docker Images Created:

All images will be pushed to Docker Hub under `pramithamj/auction-website/`:

- `pramithamj/auction-website/common`
- `pramithamj/auction-website/auth`
- `pramithamj/auction-website/bid`
- `pramithamj/auction-website/listing`
- `pramithamj/auction-website/payment`
- `pramithamj/auction-website/profile`
- `pramithamj/auction-website/email`
- `pramithamj/auction-website/expiration`
- `pramithamj/auction-website/api-gateway`
- `pramithamj/auction-website/frontend`

### Troubleshooting:

#### Pipeline Fails
1. Check GitHub Actions logs
2. Verify Docker Hub credentials in secrets
3. Ensure all Dockerfiles exist and are valid

#### Build Issues
1. Test locally with the build script
2. Check service dependencies
3. Verify file paths in the pipeline

#### Version Issues
1. Check that semantic versioning is correct
2. Verify environment variables are set properly
3. Use explicit tags if needed

### Features:

-  Multi-platform builds (linux/amd64, linux/arm64)
-  Docker layer caching for faster builds
-  Automatic versioning
-  Comprehensive logging
-  Parallel builds for efficiency
-  Security with secrets management
