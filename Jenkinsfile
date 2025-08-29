pipeline {
    agent any

    environment {
        DOCKER_REGISTRY = "docker.io"
        DOCKER_USERNAME = "pramithamj"
        SSH_KEY = credentials('ec2-ssh-key')
        EC2_IP = "3.134.88.75"
    }

    stages {
        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        // stage('Provision EC2') {
        //     steps {
        //            withCredentials([usernamePassword(credentialsId: 'aws-creds', usernameVariable: 'AWS_ACCESS_KEY_ID',passwordVariable: 'AWS_SECRET_ACCESS_KEY')]) {
        //         sh '''
        //         cd terraform
        //         terraform init -input=false
        //         terraform apply -auto-approve -input=false
        //         '''
        //         }
        //     }
        // }

        // stage('Get EC2 IP') {
        //     steps {
        //         script {
        //             EC2_IP = sh(
        //                 script: "cd terraform && terraform output -raw ec2_public_ip",
        //                 returnStdout: true
        //             ).trim()
        //             echo "EC2 Public IP: ${EC2_IP}"
        //         }
        //     }
        // }

        // stage('Debug Workspace') {
        //     steps {
        //         sh "ls -R ${WORKSPACE}/services"
        //     }
        // }

      stage('Docker Compose & Push on EC2') {
    steps {
        script {
            // Write SSH key to a temporary file
            def keyFile = "${env.WORKSPACE}/ec2_key.pem"
            writeFile file: keyFile, text: SSH_KEY
            sh "chmod 600 ${keyFile}"

            withCredentials([
                usernamePassword(credentialsId: 'Github-creds-pramitha', usernameVariable: 'GITHUB_USER', passwordVariable: 'GITHUB_TOKEN'),
                string(credentialsId: 'dockerhub-password-pramitha', variable: 'DOCKER_PASSWORD')
            ]) {
                // Commands executed on EC2
                def sshCommand = """
                    # Remove any existing repo folder
                    rm -rf ~/auction-microservice
                    # Clone the specified branch with GitHub credentials
                    git clone -b jenkins-pipeline https://${GITHUB_USER}:${GITHUB_TOKEN}@github.com/PramithaMJ/auction-microservice.git ~/auction-microservice
                    cd ~/auction-microservice
                    # Run docker-compose to build all images
                    docker-compose build
                    # Push all built images to Docker Hub
                    docker-compose push
                """
                sh "ssh -o StrictHostKeyChecking=no -i ${keyFile} ubuntu@${EC2_IP} '${sshCommand}'"
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
