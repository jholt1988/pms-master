# docker-bake.backend.hcl
# Build configuration for backend services only

variable "REGISTRY" {
  default = "ghcr.io/jholt1988"
}

variable "PROJECT" {
  default = "pms-master"
}

variable "IMAGE_TAG" {
  default = "latest"
}

variable "PLATFORMS" {
  default = "linux/amd64,linux/arm64"
}

# Group for dev builds (local images only)
group "dev" {
  targets = ["backend", "mil", "workflow-engine", "chatbot", "ml-service"]
}

# Group for production builds (push to registry)
group "prod" {
  targets = ["backend-prod", "ml-service-prod"]
}

# Group for all backend services
group "all" {
  targets = ["backend", "mil", "workflow-engine", "chatbot", "ml-service"]
}

# Development: Main backend service
target "backend" {
  dockerfile = "tenant_portal_backend/Dockerfile"
  contexts = {
    base = "docker-image://node:20-alpine"
  }
  tags = ["pms-backend:${IMAGE_TAG}"]
  output = ["type=docker"]
  args = {
    NODE_ENV = "production"
  }
  labels = {
    "service" = "backend"
    "environment" = "development"
  }
}

# Production: Main backend service (push to registry)
target "backend-prod" {
  inherits = ["backend"]
  tags = [
    "${REGISTRY}/${PROJECT}/backend:${IMAGE_TAG}",
    "${REGISTRY}/${PROJECT}/backend:latest"
  ]
  platforms = split(",", PLATFORMS)
  output = ["type=image,push=false"]
  labels = {
    "service" = "backend"
    "environment" = "production"
  }
}

# Development: MIL (security) service
target "mil" {
  dockerfile = "security/mil/Dockerfile"
  contexts = {
    base = "docker-image://node:20-alpine"
  }
  tags = ["pms-mil:${IMAGE_TAG}"]
  output = ["type=docker"]
  args = {
    NODE_ENV = "production"
  }
  labels = {
    "service" = "mil"
    "component" = "security"
  }
}

# Development: Workflow engine service
target "workflow-engine" {
  dockerfile = "services/workflow-engine/Dockerfile"
  contexts = {
    base = "docker-image://node:20-alpine"
  }
  tags = ["pms-workflow-engine:${IMAGE_TAG}"]
  output = ["type=docker"]
  args = {
    NODE_ENV = "production"
  }
  labels = {
    "service" = "workflow-engine"
    "component" = "orchestration"
  }
}

# Development: Chatbot service
target "chatbot" {
  dockerfile = "tenant_portal_backend/chatbot/Dockerfile"
  contexts = {
    base = "docker-image://node:20-alpine"
  }
  tags = ["pms-chatbot:${IMAGE_TAG}"]
  output = ["type=docker"]
  args = {
    NODE_ENV = "production"
  }
  labels = {
    "service" = "chatbot"
    "component" = "ai"
  }
}

# Development: ML service (Python)
target "ml-service" {
  dockerfile = "rent_optimization_ml/Dockerfile"
  contexts = {
    base = "docker-image://python:3.11-slim"
  }
  tags = ["pms-ml-service:${IMAGE_TAG}"]
  output = ["type=docker"]
  args = {
    ENVIRONMENT = "production"
  }
  labels = {
    "service" = "ml-service"
    "component" = "ml"
  }
}

# Production: ML service (push to registry)
target "ml-service-prod" {
  inherits = ["ml-service"]
  tags = [
    "${REGISTRY}/${PROJECT}/ml-service:${IMAGE_TAG}",
    "${REGISTRY}/${PROJECT}/ml-service:latest"
  ]
  platforms = split(",", PLATFORMS)
  output = ["type=image,push=false"]
  labels = {
    "service" = "ml-service"
    "environment" = "production"
  }
}
