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
                    cd ~/auction-microservice/terraform
                    chmod +x docker-install.sh
                    sudo ./docker-install.sh 

                    cd ~/auction-microservice

                    # Login to Docker Hub
                    echo ${DOCKER_PASSWORD} | docker login -u ${DOCKER_USERNAME} --password-stdin

                    # Build and push images with docker-compose
                    docker-compose build --progress=plain
               
                """

                sh "ssh -o StrictHostKeyChecking=no -i ${SSH_KEY_FILE} ubuntu@${EC2_IP} '${sshCommand}'"
            }
        }
    }
}



}

post {
    // always {
    //         withCredentials([usernamePassword(credentialsId: 'aws-creds', usernameVariable: 'AWS_ACCESS_KEY_ID', passwordVariable: 'AWS_SECRET_ACCESS_KEY')]) {
    //     echo "Destroying ephemeral EC2..."
    //     sh '''
    //         cd terraform
    //         terraform destroy -auto-approve -input=false
    //     '''
    // }
    // }
    success {
        echo "✅ Docker images built & pushed on ephemeral EC2."
    }
    failure {
        echo "❌ Pipeline failed."
    }
}

}
