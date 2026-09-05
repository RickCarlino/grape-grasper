PYTHON ?= python3
.DEFAULT_GOAL := screenshots

.PHONY: screenshots screenshots-force setup
setup:
	python3 -m venv .venv
	.venv/bin/python -m pip install -r requirements-render.txt

screenshots:
	$(PYTHON) scripts/render_stls.py

screenshots-force:
	$(PYTHON) scripts/render_stls.py --force
