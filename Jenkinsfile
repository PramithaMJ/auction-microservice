pipeline {
    agent any

    environment {
        DOCKER_REGISTRY = "docker.io"
        DOCKER_USERNAME = credentials('DOCKER_USERNAME')
        DOCKER_PASSWORD = credentials('DOCKER_PASSWORD')
    }

    options {
        skipDefaultCheckout(true)
        timestamps()
    }

    stages {
        stage('Checkout Code') {
            steps {
                checkout scm
            }
        }

        stage('Provision EC2') {
            steps {
                withCredentials([usernamePassword(credentialsId: 'aws-creds', usernameVariable: 'AWS_ACCESS_KEY_ID', passwordVariable: 'AWS_SECRET_ACCESS_KEY')]) {
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
                    EC2_IP = sh(script: "cd terraform && terraform output -raw ec2_public_ip", returnStdout: true).trim()
                    echo "EC2 Public IP: ${EC2_IP}"
                }
            }
        }

        stage('Setup Docker & Push Images on EC2') {
            steps {
                script {
                    withCredentials([
                        file(credentialsId: 'ec2-ssh-file', variable: 'SSH_KEY_FILE'),
                        usernamePassword(credentialsId: 'Github-creds-pramitha', usernameVariable: 'GITHUB_USER', passwordVariable: 'GITHUB_TOKEN')
                    ]) {
                        sh "chmod 600 ${SSH_KEY_FILE}"

                        // Wait for SSH to be ready
                        sh """
                        echo "Waiting for SSH on ${EC2_IP}..."
                        for i in {1..15}; do
                            if nc -z -w 5 ${EC2_IP} 22; then
                                echo "SSH is up!"
                                break
                            fi
                            echo "Still waiting... (\$i/15)"
                            sleep 10
                        done
                        """

                        // Commands to run on EC2
                        def sshCommand = """
                            # Cleanup previous folder
                            rm -rf ~/auction-microservice

                            # Clone the branch
                            git clone -b jenkins-pipeline https://${GITHUB_TOKEN}@github.com/PramithaMJ/auction-microservice.git ~/auction-microservice

                            cd ~/auction-microservice/terraform
                            chmod +x docker-install.sh
                            sudo ./docker-install.sh

                            cd ~/auction-microservice

                            # Login to Docker Hub
                            echo ${DOCKER_PASSWORD} | sudo docker login -u ${DOCKER_USERNAME} --password-stdin

                            # Build & push images
                            sudo docker-compose build --progress=plain && sudo docker-compose push
                            
                        """

                        sh "ssh -o StrictHostKeyChecking=no -i ${SSH_KEY_FILE} ubuntu@${EC2_IP} '${sshCommand}'"
                    }
                }
            }
        }
    }

    post post {
    always {
        script {
            try {
                // Ask for user input with timeout
                def userInput = timeout(time: 20, unit: 'MINUTES') {
                    input(
                        message: "Do you want to destroy the ephemeral EC2?",
                        ok: "Destroy",
                        parameters: [
                            [$class: 'BooleanParameterDefinition', defaultValue: true, description: 'Check to confirm destruction', name: 'CONFIRM_DESTROY']
                        ]
                    )
                }

                // If user confirms, destroy
                if (userInput) {
                    echo "User confirmed destruction."
                } else {
                    echo "User declined destruction, skipping..."
                    return
                }
            } catch (err) {
                // Timeout or abort -> auto destroy
                echo "No input provided or timeout reached. Proceeding to destroy EC2 automatically."
            }

            // Destroy EC2
            withCredentials([usernamePassword(credentialsId: 'aws-creds', usernameVariable: 'AWS_ACCESS_KEY_ID', passwordVariable: 'AWS_SECRET_ACCESS_KEY')]) {
                echo "Destroying ephemeral EC2..."
                sh '''
                cd terraform
                terraform destroy -auto-approve -input=false
                '''
            }
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
