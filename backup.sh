#!/bin/bash

# Yapılandırma
API_URL="https://34-mu.vercel.app/api/backup"
API_KEY="2fae79f510600a2565ff025cd605cf9bbeedde37132589563deb983981aa2779"
BACKUP_DIR="./backups"
DATE=$(date +%Y%m%d)

# Backup dizinini oluştur
mkdir -p "$BACKUP_DIR/$DATE"

# Veri tiplerini tanımla
TYPES=("users" "products" "stockMovements" "alerts" "auditLogs")

# Her veri tipi için backup al
for type in "${TYPES[@]}"; do
  echo "Backing up $type..."
  
  # İlk sayfayı al ve toplam sayfa sayısını öğren
  response=$(curl -s -I -X GET "${API_URL}?type=${type}&page=1" \
    -H "x-api-key: ${API_KEY}")
  
  total_pages=$(echo "$response" | grep -i "x-total-pages" | cut -d' ' -f2 | tr -d '\r')
  
  if [ -z "$total_pages" ]; then
    echo "Error: Could not get total pages for $type"
    continue
  fi
  
  # Tüm sayfaları indir
  for ((page=1; page<=total_pages; page++)); do
    echo "Downloading $type - Page $page of $total_pages"
    
    curl -X GET "${API_URL}?type=${type}&page=${page}" \
      -H "x-api-key: ${API_KEY}" \
      -o "$BACKUP_DIR/$DATE/${type}_${page}_of_${total_pages}.json.gz"
      
    if [ $? -ne 0 ]; then
      echo "Error downloading $type page $page"
      continue
    fi
  done
done

echo "Backup completed at $(date)" 