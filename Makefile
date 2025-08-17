SHELL := bash

COLOR_START = \e[1;32m
COLOR_END   = \e[0m
SAY         = @printf "$(COLOR_START)%s\n$(COLOR_END)"


.PHONY: install build format lint check

install:
	$(SAY) "Install dependencies..."
	@npm $@

build:
	$(SAY) "Start building package..."
	@npm run $@

format:
	$(SAY) "Format code..."
	@npm run $@

lint:
	$(SAY) "Linting..."
	@npm run $@

check:
	$(SAY) "Checking..."
	@npm run $@



