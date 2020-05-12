clean: ## Clean
	rm -rf dist
	rm -rf build
	rm -rf *.egg-info
	rm -rf app
	rm -rf labml_dashboard/app

compile: ## Compile JS
	rm -rf app
	mkdir app
	mkdir app/ui
	cp ui/index.html app/ui/index.html
	cp -r ui/images app/ui/
	npm run build

watch: compile ## Watch and Compile JS
	npm run build
	npm run watch

build: clean compile ## Build PIPy Package
	cp package.json app/
	cp package-lock.json app/
	mv app/ labml_dashboard/
	python setup.py sdist bdist_wheel

check-content: build  ## List contents of PIPy Package
	tar -tvf dist/*.tar.gz

check: build  ## Check PIPy Package
	twine check dist/*

upload: build  ## Upload PIPy Package
	twine upload dist/*

install:  ## Install from repo
	pip install -e .

uninstall: ## Uninstall
	pip uninstall labml_dashboard labml

help: ## Show this help.
	@fgrep -h "##" $(MAKEFILE_LIST) | fgrep -v fgrep | sed -e 's/\\$$//' | sed -e 's/##//'

.PHONY: clean compile build check upload help
.DEFAULT_GOAL := help
