clean:
	rm -rf dist
	rm -rf build
	rm -rf *.egg-info
	rm -rf app
	rm -rf lab_dashboard/app

compile:
	npm run build

watch:
	npm run build
	npm run watch

build: clean compile
	cp package.json app/
	cp package-lock.json app/
	mv app/ lab_dashboard/
	python setup.py sdist bdist_wheel

check-content: build
	tar -tvf dist/*.tar.gz

check: build
	twine check dist/*

upload: build
	twine upload dist/*

install:
	pip install -e .

uninstall:
	pip uninstall machine_learning_lab_dashboard machine_learning_lab

.PHONY: clean compile build check upload
