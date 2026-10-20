.PHONY: install dev serve build release test test-setup docker-build docker-run docker-test

install:
	npm ci

dev:
	npm run dev -- --host 0.0.0.0 --port 5173 --strictPort

serve:
	npm start

build:
	npm run build

release:
	npm run release

test:
	npm test

test-setup:
	npm run test:setup

docker-build:
	docker build -t umbo-mobile-prototype .

docker-run:
	docker run --rm -p 8080:80 umbo-mobile-prototype

docker-test:
	docker build --target test -t umbo-mobile-test .
	docker run --rm --network none umbo-mobile-test make test
