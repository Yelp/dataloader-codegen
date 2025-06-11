node_modules: package.json
	yarn

.PHONY: swapi-loaders.ts
swapi-loaders.ts:
	node ../../lib/index.js --config swapi.dataloader-config.yaml --output swapi-loaders.ts

.PHONY: build
build: node_modules
	yarn babel *.ts -d build -x .ts
