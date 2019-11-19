node_modules: package.json
	yarn

swapi-loaders.js:
	node ../../lib/index.js --config swapi.dataloader-config.yaml --output swapi-loaders.js

flow-typed: node_modules
	node_modules/.bin/flow-typed install
