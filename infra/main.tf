# eks-cluster/main.tf

module "eks" {
  source  = "terraform-aws-modules/eks/aws"
  version = "19.16.0"

  cluster_name    = var.cluster_name
  cluster_version = var.cluster_version

  # Networking
  vpc_id     = module.vpc.vpc_id
  subnet_ids = module.vpc.private_subnets

  create_cluster_primary_security_group_tags = true
# Enable the public endpoint so you can access the cluster from your local machine
  cluster_endpoint_public_access  = true

  # It's good practice to also enable private access for communication within the VPC
  cluster_endpoint_private_access = true

  eks_managed_node_group_defaults = {
    iam_role_attach_cni_policy = true
  }

  cluster_addons = {
    aws-ebs-csi-driver = {
      most_recent = true 
    }
  }

  eks_managed_node_groups = {
    microservices_pool = {
      name           = "app-nodes"
      instance_types = var.instance_types

      # Autoscaling configuration
      min_size     = 1
      max_size     = 4
      desired_size = 3

      # Link to the IAM role we created
      iam_role_arn = aws_iam_role.eks_node_group_role.arn

      # For better health and update management
      update_config = {
        max_unavailable_percentage = 33
      }
    }
  }
  
  # Optional: Map additional IAM users or roles to the Kubernetes RBAC
  # aws_auth_roles = [
  #   {
  #     rolearn  = "arn:aws:iam::ACCOUNT_ID:role/your-admin-role"
  #     username = "admin-user"
  #     groups   = ["system:masters"]
  #   }
  # ]
}