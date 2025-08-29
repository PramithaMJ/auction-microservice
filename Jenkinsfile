pipeline {
    agent any

    environment {
        DOCKER_REGISTRY = "docker.io"
        DOCKER_USERNAME = "pramithamj"
        DOCKER_PASSWORD = credentials('dockerhub-password-pramitha')
        SSH_KEY = credentials('ec2-ssh-key')
    }

    stages {
        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        stage('Provision EC2') {
            steps {
                   withCredentials([usernamePassword(credentialsId: 'aws-creds', usernameVariable: 'AWS_ACCESS_KEY_ID',passwordVariable: 'AWS_SECRET_ACCESS_KEY')]) {
                sh '''
                cd terraform
                terraform init -input=false
                terraform apply -auto-approve -input=false
                '''
                }
            }
        }

        stage('Get EC2 IP') {
            steps {
                script {
                    EC2_IP = sh(
                        script: "cd terraform && terraform output -raw ec2_public_ip",
                        returnStdout: true
                    ).trim()
                    echo "EC2 Public IP: ${EC2_IP}"
                }
            }
        }

        stage('Docker Build & Push on EC2') {
            steps {
                script {
                    def services = ['common','auth','bid','listing','payment','profile','email','expiration','api-gateway','frontend']

                    for (svc in services) {
                        sh """
                        # Copy service code to EC2
                        scp -o StrictHostKeyChecking=no -i ${SSH_KEY} -r ./services/${svc} ubuntu@${EC2_IP}:/home/ubuntu/${svc}

                        # Build & push Docker image
                        ssh -o StrictHostKeyChecking=no -i ${SSH_KEY} ubuntu@${EC2_IP} '
                          cd /home/ubuntu/${svc}
                          echo ${DOCKER_PASSWORD} | docker login -u ${DOCKER_USERNAME} --password-stdin
                          docker buildx build \
                              --platform linux/amd64,linux/arm64 \
                              -t ${DOCKER_USERNAME}/auction-website-ms-${svc}:v1.0.${BUILD_NUMBER} \
                              -t ${DOCKER_USERNAME}/auction-website-ms-${svc}:latest \
                              -f Dockerfile \
                              . \
                              --push
                        '
                        """
                    }
                }
            }
        }

        stage('Destroy EC2') {
            steps {
                sh '''
                cd terraform
                terraform destroy -auto-approve -input=false
                '''
            }
        }
    }

    post {
        success {
            echo "✅ Docker images built & pushed on ephemeral EC2."
        }
        failure {
            echo "❌ Pipeline failed."
        }
    }
}
