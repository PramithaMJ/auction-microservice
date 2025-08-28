pipeline {
    agent any

    environment {
        DOCKER_REGISTRY = "docker.io"
        DOCKER_USERNAME = "pramithamj"
        DOCKER_PASSWORD = credentials('dockerhub-password') // store in Jenkins credentials
    }

    options {
        skipStagesAfterUnstable()
    }

    stages {
        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        stage('Install Dependencies & Test') {
            steps {
                sh '''
                    # Install common dependencies
                    cd common && npm ci && cd ..

                    # Install service dependencies
                    for service in services/*/; do
                      if [ -f "$service/package.json" ]; then
                        echo "Installing dependencies for $service"
                        cd "$service" && npm ci && cd ../..
                      fi
                    done

                    # Run common tests
                    cd common && npm test && cd ..

                    # Run service tests
                    for service in services/*/; do
                      if [ -f "$service/package.json" ] && [ -d "$service/tests" ]; then
                        echo "Running tests for $service"
                        cd "$service" && npm test && cd ../..
                      fi
                    done
                '''
            }
        }

        stage('Build & Push Docker Images') {
            when {
                anyOf {
                    branch 'main'
                    expression { return env.GIT_BRANCH?.startsWith("origin/tags/v") }
                }
            }
            matrix {
                axes {
                    axis {
                        name 'SERVICE'
                        values 'common', 'auth', 'bid', 'listing', 'payment', 'profile', 'email', 'expiration', 'api-gateway', 'frontend'
                    }
                }
                stages {
                    stage('Docker Build & Push') {
                        steps {
                            script {
                                def contexts = [
                                    "common"      : "./common",
                                    "auth"        : "./services/auth",
                                    "bid"         : "./services/bid",
                                    "listing"     : "./services/listings",
                                    "payment"     : "./services/payments",
                                    "profile"     : "./services/profile",
                                    "email"       : "./services/email",
                                    "expiration"  : "./services/expiration",
                                    "api-gateway" : "./services/api-gateway",
                                    "frontend"    : "./services/frontend"
                                ]

                                def dockerfiles = [
                                    "common"      : "./common/Dockerfile",
                                    "auth"        : "./services/auth/Dockerfile",
                                    "bid"         : "./services/bid/Dockerfile",
                                    "listing"     : "./services/listings/Dockerfile",
                                    "payment"     : "./services/payments/Dockerfile",
                                    "profile"     : "./services/profile/Dockerfile",
                                    "email"       : "./services/email/Dockerfile",
                                    "expiration"  : "./services/expiration/Dockerfile",
                                    "api-gateway" : "./services/api-gateway/Dockerfile",
                                    "frontend"    : "./services/frontend/Dockerfile.dev"
                                ]

                                def imageName = "${DOCKER_USERNAME}/auction-website-ms-${SERVICE}"
                                def imageTag  = "v1.0.${BUILD_NUMBER}"

                                sh """
                                    echo $DOCKER_PASSWORD | docker login -u $DOCKER_USERNAME --password-stdin
                                    docker buildx build \
                                        --platform linux/amd64,linux/arm64 \
                                        -t ${imageName}:${imageTag} \
                                        -t ${imageName}:latest \
                                        -f ${dockerfiles[SERVICE]} \
                                        ${contexts[SERVICE]} \
                                        --push
                                """
                            }
                        }
                    }
                }
            }
        }

        stage('Deploy Staging') {
            when {
                branch 'main'
            }
            steps {
                sh '''
                  echo "Deploying to staging environment"
                  echo "Version: v1.0.${BUILD_NUMBER}"
                  # kubectl apply -f k8s/ --namespace=staging
                  # helm upgrade auction-website ./charts --namespace=staging
                '''
            }
        }

        stage('Deploy Production') {
            when {
                expression { return env.GIT_BRANCH?.startsWith("origin/tags/v") }
            }
            steps {
                sh '''
                  echo "Deploying to production environment"
                  echo "Version: ${GIT_BRANCH}"
                  # kubectl apply -f k8s/ --namespace=production
                  # helm upgrade auction-website ./charts --namespace=production
                '''
            }
        }
    }

    post {
        success {
            echo "✅ CI/CD Pipeline completed successfully!"
            echo "All Docker images built & pushed"
            echo "Version: v1.0.${BUILD_NUMBER}"
        }
        failure {
            echo "❌ CI/CD Pipeline failed! Check logs."
        }
    }
}
