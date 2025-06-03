node_modules: package.json
	yarn

spaceapi-loaders.js:
	node ../../lib/index.js --config spaceapi.dataloader-config.yaml --output spaceapi-loaders.js

flow-typed: node_modules
	yarn flow-typed install

.PHONY: build
build: node_modules
	yarn babel *.js -d build
