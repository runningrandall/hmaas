.PHONY: deploy destroy synth dev local-db init-db local-api

deploy:
	pnpm --filter infra run deploy

destroy:
	pnpm --filter infra run destroy

synth:
	pnpm --filter infra run synth

dev:
	pnpm --filter frontend run dev

local-db:
	./scripts/start-local-db.sh

init-db:
	./scripts/init-local-db.sh

local-api:
	./scripts/start-local-api.sh
