# docker-bake.hcl
# Build configuration for PMS services from docker-compose

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
  targets = ["backend", "frontend", "mil", "workflow-engine", "ml-service"]
}

# Group for production builds (push to registry)
group "prod" {
  targets = ["backend-prod", "frontend-prod"]
}

# Group for all buildable services
group "all" {
  targets = ["backend", "frontend", "mil", "workflow-engine", "ml-service", "chatbot"]
}

# Development: Backend service
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
}

# Production: Backend service (push to registry)
target "backend-prod" {
  inherits = ["backend"]
  tags = [
    "${REGISTRY}/${PROJECT}/backend:${IMAGE_TAG}",
    "${REGISTRY}/${PROJECT}/backend:latest"
  ]
  platforms = split(",", PLATFORMS)
  output = ["type=image,push=false"]
}

# Development: Frontend service
target "frontend" {
  dockerfile = "tenant_portal_app/Dockerfile"
  contexts = {
    base = "docker-image://node:20-alpine"
  }
  tags = ["pms-frontend:${IMAGE_TAG}"]
  output = ["type=docker"]
  args = {
    VITE_API_URL = "/api"
  }
}

# Production: Frontend service (push to registry)
target "frontend-prod" {
  inherits = ["frontend"]
  tags = [
    "${REGISTRY}/${PROJECT}/frontend:${IMAGE_TAG}",
    "${REGISTRY}/${PROJECT}/frontend:latest"
  ]
  platforms = split(",", PLATFORMS)
  output = ["type=image,push=false"]
}

# Development: MIL service
target "mil" {
  dockerfile = "security/mil/Dockerfile"
  tags = ["pms-mil:${IMAGE_TAG}"]
  output = ["type=docker"]
  args = {
    NODE_ENV = "production"
  }
}

# Development: Workflow engine
target "workflow-engine" {
  dockerfile = "services/workflow-engine/Dockerfile"
  tags = ["pms-workflow-engine:${IMAGE_TAG}"]
  output = ["type=docker"]
  args = {
    NODE_ENV = "production"
  }
}

# Development: ML service
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
}
