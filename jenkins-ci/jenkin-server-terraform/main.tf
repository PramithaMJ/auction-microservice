# Terraform configuration for Jenkins EC2 server
provider "aws" {
  region = "us-east-1" # Change as needed
}

resource "aws_key_pair" "jenkins_key" {
  key_name   = "jenkins-key"
  public_key = file("~/.ssh/id_rsa.pub") # Update path if needed
}

resource "aws_security_group" "jenkins_sg" {
  name        = "jenkins-sg"
  description = "Allow SSH and Jenkins"

  ingress {
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    from_port   = 8080
    to_port     = 8080
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

resource "aws_instance" "jenkins_server" {
  ami           = "ami-0fc682b3a5d04fff3" # Ubuntu Server 22.04 LTS (us-east-1), update for your region if needed
  instance_type = "t2.medium"
  key_name      = aws_key_pair.jenkins_key.key_name
  security_groups = [aws_security_group.jenkins_sg.name]

  user_data = file("${path.module}/user_data.sh")

  tags = {
    Name = "Jenkins-Server"
  }
}

output "jenkins_public_ip" {
  value = aws_instance.jenkins_server.public_ip
  description = "Public IP of the Jenkins server. Access Jenkins at http://<public_ip>:8080"
}
