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

.PHONY: test
test: build venv node_modules
	venv/bin/pre-commit install -f --install-hooks
	venv/bin/pre-commit run --all-files
	yarn test

.PHONY: clean
clean:
	# remove everything targeted by .gitignore
	git clean -fdX
