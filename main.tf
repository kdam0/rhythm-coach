terraform {
  required_providers {
    cloudflare = {
      source  = "cloudflare/cloudflare"
      version = "~> 5.0"
    }
  }
}

variable "cloudflare_api_token" {
  type        = string
  sensitive   = true
  description = "Cloudflare API Token with AI: Edit, and Worker Script: Edit permissions"
}

variable "cloudflare_account_id" {
  type        = string
  description = "Cloudflare Account ID"
}

provider "cloudflare" {
  api_token = var.cloudflare_api_token
}

resource "cloudflare_workers_script" "rhythm_coach" {
  account_id         = var.cloudflare_account_id
  script_name        = "rhythm-coach"
  content            = file("${path.module}/dist/worker.js")
  main_module        = "worker.js"
  compatibility_date = "2026-01-01"

  bindings = [
    {
      name = "AI"
      type = "ai"
    },
    {
      name       = "AUDITION_SESSIONS"
      type       = "durable_object_namespace"
      class_name = "AuditionSession"
    }
  ]

  migrations = {
    new_sqlite_classes = ["AuditionSession"]
  }
}

resource "cloudflare_workers_script_subdomain" "rhythm_coach" {
  account_id  = var.cloudflare_account_id
  script_name = cloudflare_workers_script.rhythm_coach.script_name
  enabled     = true
}

variable "workers_dev_subdomain" {
  type        = string
  description = "Your account's workers.dev subdomain"
}

output "worker_url" {
  value       = "https://${cloudflare_workers_script.rhythm_coach.script_name}.${var.workers_dev_subdomain}.workers.dev"
  description = "Deployed Worker URL"
}
