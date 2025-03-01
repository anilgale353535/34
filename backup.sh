#!/bin/bash

# API URL
API_URL="https://34-mu.vercel.app/api/backup"

# API Key
API_KEY="2fae79f510600a2565ff025cd605cf9bbeedde37132589563deb983981aa2779"

# Yedek al
curl -X GET "${API_URL}" \
  -H "x-api-key: ${API_KEY}" \
  -m 30 \
  --output "backup-$(date +%Y%m%d_%H%M%S).sql" 