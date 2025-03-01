#!/bin/bash

# API URL (Vercel URL'inizi buraya yazın)
API_URL="https://your-app.vercel.app/api/backup"

# API Key
API_KEY="2fae79f510600a2565ff025cd605cf9bbeedde37132589563deb983981aa2779"

# Yedek al
curl -X GET "${API_URL}" \
  -H "x-api-key: ${API_KEY}" \
  --output "backup-$(date +%Y%m%d_%H%M%S).sql" 