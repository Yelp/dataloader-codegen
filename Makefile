PYTHON3 := $(shell command -v python3.8 || command -v python3)

.PHONY: minimal
minimal: node_modules build

venv: Makefile requirements-dev.txt
	rm -rf venv
	virtualenv venv --python=$(PYTHON3)
	venv/bin/pip install -r requirements-dev.txt

node_modules: package.json
	yarn

build: node_modules
	yarn build
	# Generate the .d.ts files
	node_modules/.bin/tsc --project tsconfig.json --checkJs false --emitDeclarationOnly || true

link-examples: build
	yarn link
	cd examples/swapi
	yarn link dataloader-codegen

build-examples: link-examples
	$(MAKE) -C examples/swapi swapi-loaders.ts
	$(MAKE) -C examples/swapi build
	node examples/swapi/build/swapi-server.js

.PHONY: test
test: build venv node_modules build-examples
	venv/bin/pre-commit install -f --install-hooks
	venv/bin/pre-commit run --all-files
	yarn test
	yarn test:exampleTypes

.PHONY: clean
clean:
	# remove everything targeted by .gitignore
	git clean -fdX
