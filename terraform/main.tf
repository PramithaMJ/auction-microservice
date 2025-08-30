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
provisioner "local-exec" 
{
  slee  
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
