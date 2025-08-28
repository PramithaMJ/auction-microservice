resource "aws_instance" "jenkins_build_agent" {
  ami           = "ami-0cfde0ea8edd312d4"
  instance_type = "t3.medium"
  key_name      = "jenkins-kp"
  security_groups = "jenkins-sg"
  region = "us-east-2"

  tags = {
    Name = "jenkins-build-agent"
  }

user_data = <<-EOF
    #!/bin/bash
    set -ex
    apt-get update -y
    apt-get upgrade -y
    apt-get install -y ca-certificates curl gnupg lsb-release fontconfig openjdk-21-jre
    install -m 0755 -d /etc/apt/keyrings
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | tee /etc/apt/keyrings/docker.asc > /dev/null
    chmod a+r /etc/apt/keyrings/docker.asc
    echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "${UBUNTU_CODENAME:-$VERSION_CODENAME}") stable" | tee /etc/apt/sources.list.d/docker.list
    apt-get update -y
    apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
  EOF
}
