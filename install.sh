#!/bin/bash

echo "Building dashboard"
npm install
npm run build

echo "Setting up shell command"
pip install -e .

echo "Run \"lab_dashboard\" from your project folder."
