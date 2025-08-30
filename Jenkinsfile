pipeline {
    agent any

    environment {
        DOCKER_REGISTRY = "docker.io"
        DOCKER_USERNAME = "pramithamj"
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

   stage('Install Docker on Remote Agent') {
    steps {
        script {
            withCredentials([
                // Load the SSH key file from Jenkins credentials
                file(credentialsId: 'ec2-ssh-file', variable: 'SSH_KEY_FILE'),
            ]) {
                // STEP 1: Define the entire remote script in a SINGLE-QUOTED Groovy variable.
                // This prevents Groovy from trying to interpret any '$' characters.
                def installScript = '''
                    #!/bin/bash
                    set -ex

                    # Idempotency Check: Only run if docker is not already installed
                    if command -v docker &> /dev/null; then
                        echo "✅ Docker is already installed. Skipping installation."
                        docker --version
                        exit 0
                    fi

                    echo "Docker not found. Starting remote installation..."

                    # Update and install prerequisites
                    sudo apt-get update -y
                    sudo apt-get install -y ca-certificates curl gnupg

                    # Add Docker's official GPG key
                    sudo install -m 0755 -d /etc/apt/keyrings
                    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo tee /etc/apt/keyrings/docker.asc > /dev/null
                    sudo chmod a+r /etc/apt/keyrings/docker.asc

                    # Add the Docker repository to Apt sources
                    echo \
                      "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu \
                      $(. /etc/os-release && echo "${UBUNTU_CODENAME:-$VERSION_CODENAME}") stable" | \
                      sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

                    # Install Docker Engine and Compose Plugin
                    sudo apt-get update -y
                    sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

                    # Add the 'ubuntu' user to the 'docker' group
                    # NOTE: This won't affect the current session.
                    sudo usermod -aG docker ubuntu
                    
                    echo "✅ Docker installation on remote host complete."
                '''

                sh "chmod 600 ${SSH_KEY_FILE}"


                sh """
                    echo '${installScript}' | ssh -o StrictHostKeyChecking=no -i ${SSH_KEY_FILE} ubuntu@${EC2_IP} 'bash'
                """
            }
        }
    }
}


    stage('Docker Compose & Push on EC2') {
    steps {
        script {
            withCredentials([
                file(credentialsId: 'ec2-ssh-file', variable: 'SSH_KEY_FILE'),
                usernamePassword(credentialsId: 'Github-creds-pramitha', usernameVariable: 'GITHUB_USER', passwordVariable: 'GITHUB_TOKEN'),
                string(credentialsId: 'dockerhub-password-pramitha', variable: 'DOCKER_PASSWORD')
            ]) {
                // Ensure key file has correct permissions
                sh "chmod 600 ${SSH_KEY_FILE}"

                // SSH to EC2 and run commands
                def sshCommand = """
                    # Remove any existing repo folder
                    rm -rf ~/auction-microservice

                    # Clone the branch with GitHub credentials
                    git clone -b jenkins-pipeline https://${GITHUB_TOKEN}@github.com/PramithaMJ/auction-microservice.git ~/auction-microservice
                    cd ~/auction-microservice

                    # Login to Docker Hub
                    echo ${DOCKER_PASSWORD} | docker login -u ${DOCKER_USERNAME} --password-stdin

                    # Build and push images with docker-compose
                    docker compose build --progress=plain
               
                """

                sh "ssh -o StrictHostKeyChecking=no -i ${SSH_KEY_FILE} ubuntu@${EC2_IP} '${sshCommand}'"
            }
        }
    }
}



}

post {
    always {
            withCredentials([usernamePassword(credentialsId: 'aws-creds', usernameVariable: 'AWS_ACCESS_KEY_ID', passwordVariable: 'AWS_SECRET_ACCESS_KEY')]) {
        echo "Destroying ephemeral EC2..."
        sh '''
            cd terraform
            terraform destroy -auto-approve -input=false
        '''
    }
    }
    success {
        echo "✅ Docker images built & pushed on ephemeral EC2."
    }
    failure {
        echo "❌ Pipeline failed."
    }
}

}
