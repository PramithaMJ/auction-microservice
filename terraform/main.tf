provider "aws" {
  region = var.aws_region
}


resource "aws_instance" "jenkins_build_agent" {
  ami             = "ami-0cfde0ea8edd312d4"
  instance_type   = "t3.medium"
  key_name        = "jenkins-kp"
  region          = "us-east-2"
  vpc_security_group_ids = [aws_security_group.jenkins_sg.id]
  tags = {
    Name = "jenkins-build-agent"

  }

  user_data = <<-EOF
    #!/bin/bash
    set -ex

    # Update system
    apt-get update -y
    apt-get upgrade -y

    # Add Docker GPG key
    install -m 0755 -d /etc/apt/keyrings
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
    chmod a+r /etc/apt/keyrings/docker.asc

    # Add Docker repo
    echo \
      "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu \
      $(. /etc/os-release && echo "$${UBUNTU_CODENAME:-$$VERSION_CODENAME}") stable" | \
      sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

    # Install Docker & Compose plugin
    apt-get update -y
    apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

    # Enable Docker service
    systemctl enable docker
    systemctl start docker

    # Allow ubuntu user to use docker without sudo
    usermod -aG docker ubuntu
  EOF


provisioner "local-exec" {
  command = "sleep 60"
}

}
data "aws_vpc" "default" {
  default = true
}

resource "aws_security_group" "jenkins_sg" {
  name        = "jenkins-runner-sg"
  description = "Allow SSH and Jenkins agent traffic"
  vpc_id      = data.aws_vpc.default.id
}
resource "aws_vpc_security_group_ingress_rule" "allow_all_ssh"{
  security_group_id = aws_security_group.jenkins_sg.id
  cidr_ipv4 = "0.0.0.0/0"
  from_port = 22
  to_port = 22
  ip_protocol = "tcp"
}

resource "aws_vpc_security_group_ingress_rule" "allow_jenkins_traffic"{
  security_group_id = aws_security_group.jenkins_sg.id
  cidr_ipv4 = "0.0.0.0/0"
  from_port = 8080
  to_port = 8080
  ip_protocol = "tcp"
}
resource "aws_vpc_security_group_egress_rule" "allow_all_traffic_ipv4" {
  security_group_id = aws_security_group.jenkins_sg.id
  cidr_ipv4         = "0.0.0.0/0"
  ip_protocol       = "-1" 
}

output "ec2_public_ip" {
  value = aws_instance.jenkins_build_agent.public_ip
}
