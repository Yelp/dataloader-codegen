node_modules: package.json
	yarn

.PHONY: swapi-loaders.js
swapi-loaders.js:
	node ../../lib/index.js --config swapi.dataloader-config.yaml --output swapi-loaders.js

.PHONY: swapi-loaders-ts.ts
swapi-loaders-ts.ts:
	node ../../lib/index.js --config swapi.dataloader-config-ts.yaml --output swapi-loaders-ts.ts

flow-typed: node_modules
	yarn flow-typed install

.PHONY: build
build: node_modules
	yarn babel *.js -d build
	yarn build
