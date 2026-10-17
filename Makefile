# Local preview with Podman (production is GitHub Pages). `make help` lists targets.
PODMAN ?= podman
NAME   ?= halflives
PORT   ?= 8080
IMAGE  ?= localhost/$(NAME)
BIOME  := npx --yes @biomejs/biome@2.5.15

.PHONY: help build start stop restart status logs dev serve test lint fmt

help: ## list targets
	@grep -E '^[a-z]+:.*## ' $(MAKEFILE_LIST) | awk -F':.*## ' '{printf "  %-8s %s\n", $$1, $$2}'

build: ## build the container image
	$(PODMAN) build -t $(IMAGE) .

start: build ## run in background on http://localhost:PORT (default 8080)
	$(PODMAN) run -d --rm --name $(NAME) -p $(PORT):8080 $(IMAGE)
	@echo "→ http://localhost:$(PORT)"

stop: ## stop the background container
	-$(PODMAN) stop $(NAME)

restart: stop start ## rebuild and restart

status: ## show the container
	$(PODMAN) ps --filter name=$(NAME)

logs: ## follow container logs
	$(PODMAN) logs -f $(NAME)

dev: ## serve the working tree live (no rebuild), Ctrl-C to stop
	$(PODMAN) run --rm --name $(NAME)-dev -p $(PORT):8080 -v ./:/usr/share/nginx/html:ro,Z docker.io/nginxinc/nginx-unprivileged:1.27-alpine

serve: ## no Podman? plain Python server
	python3 -m http.server $(PORT)

test: ## run all tests
	node --test

lint: ## lint + format check
	$(BIOME) ci .

fmt: ## apply formatting and safe fixes
	$(BIOME) check --write .
