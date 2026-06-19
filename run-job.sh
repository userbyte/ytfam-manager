#!/usr/bin/env bash

JOB_NAME=$1
YTMGR_URL="http://127.0.0.1:3000"

if [ -z ${JOB_SECRET+x} ]; then
  if [ -f .env ]; then
    echo "(using secret from .env file)"
    source .env
  else
    echo "[warning] job secret is not set, the job will not run!"
  fi
else
  echo "(using secret from shell environment)"
fi

echo "triggering $JOB_NAME job..."
resp=$(curl -s --header "psst: $JOB_SECRET" --request GET $YTMGR_URL/api/jobs/$JOB_NAME)
echo $resp