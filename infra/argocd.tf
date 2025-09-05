resource "helm_release" "argocd" {
  depends_on = [module.eks]

  name             = "argo-cd"
  namespace        = "argocd"
  repository       = "https://argoproj.github.io/argo-helm"
  chart            = "argo-cd"
  version          = "6.7.15"
  create_namespace = true

  set {
    name  = "server.service.type"
    value = "LoadBalancer"
  }
}
