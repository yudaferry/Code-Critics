#!/bin/bash
# Suppress yarn warnings during Vercel build
export YARN_SILENT=1
corepack enable
yarn set version 4.9.2 2>/dev/null || true
yarn install --silent 2>/dev/null || yarn install
yarn build
