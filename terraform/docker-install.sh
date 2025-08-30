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
    "deb [arch=amd64 signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu noble stable | \
    sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

  # Install Docker (without the new Compose plugin)
  apt-get update -y
  apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin

  # Install specific older Docker Compose (classic binary)
   
curl -L "https://github.com/docker/compose/releases/download/1.29.2/docker-compose-Linux-x86_64" -o /usr/local/bin/docker-compose
 chmod +x /usr/local/bin/docker-compose

  # Enable Docker service
  systemctl enable docker
  systemctl start docker

  # Allow ubuntu user to use docker without sudo
  usermod -aG docker ubuntu 
  touch /var/lib/cloud/instance/boot-finished
EOF
