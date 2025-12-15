.PHONY: all test build

all: test build

test: 
	pnpm hardhat test

build: 
	pnpm hardhat compile
