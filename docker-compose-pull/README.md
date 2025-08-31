# Docker Compose Pull: Run Auction Website from Docker Hub

## Usage

1. **Copy `.env` file**
   - Ensure you have a valid `.env` file in the root directory. This is required for environment variables.

2. **Pull Images from Docker Hub**
   ```sh
   docker-compose -f docker-compose-pull/docker-compose-pull-v2.yml pull
   ```

3. **Start Services**
   ```sh
   docker-compose -f docker-compose-pull/docker-compose-pull-v2.yml up -d
   ```

4. **Check Status**
   ```sh
   docker-compose -f docker-compose-pull/docker-compose-pull-v2.yml ps
   ```

5. **View Logs**
   ```sh
   docker-compose -f docker-compose-pull/docker-compose-pull-v2.yml logs -f
   ```

## Troubleshooting
- If a service fails to start, check its logs:
  ```sh
  docker-compose -f docker-compose-pull/docker-compose-pull-v2.yml logs <service-name>
  ```
- Ensure your `.env` file has all required variables and correct values.
- Make sure Docker can access Docker Hub (check your network and Docker login).
- If you see `Image not found`, verify the image exists on Docker Hub and the tag is correct.

## Notes
- This setup does **not** build images locally. It only pulls from Docker Hub.
- For local development or custom builds, use the main `docker-compose.yml`.
