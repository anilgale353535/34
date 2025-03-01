#!/bin/bash

# Yapılandırma
API_URL="https://34-mu.vercel.app/api/restore"
API_KEY="2fae79f510600a2565ff025cd605cf9bbeedde37132589563deb983981aa2779"

# Kullanım bilgisi
usage() {
  echo "Kullanım: $0 <backup_dizini>"
  echo "Örnek: $0 backups/20250301"
  exit 1
}

# Parametre kontrolü
if [ -z "$1" ]; then
  usage
fi

BACKUP_DIR="$1"

# Dizin kontrolü
if [ ! -d "$BACKUP_DIR" ]; then
  echo "Hata: $BACKUP_DIR dizini bulunamadı"
  exit 1
fi

# Her dosya için geri yükleme işlemi
for file in "$BACKUP_DIR"/*.json.gz; do
  if [ ! -f "$file" ]; then
    echo "Uyarı: Dizinde .json.gz dosyası bulunamadı"
    continue
  fi

  # Dosya adından tipi çıkar
  filename=$(basename "$file")
  type=$(echo "$filename" | cut -d'-' -f2)

  echo "Geri yükleniyor: $filename (Tip: $type)"
  
  # Dosyayı API'ye gönder
  response=$(curl -s -X POST "${API_URL}?type=${type}" \
    -H "x-api-key: ${API_KEY}" \
    -H "Content-Type: application/gzip" \
    --data-binary "@${file}")
  
  # Yanıtı kontrol et
  if echo "$response" | grep -q "success\":true"; then
    count=$(echo "$response" | grep -o '"count":[0-9]*' | cut -d':' -f2)
    echo "✓ Başarılı: $count kayıt yüklendi"
  else
    error=$(echo "$response" | grep -o '"error":"[^"]*"' | cut -d'"' -f4)
    echo "✗ Hata: $error"
  fi
done

echo "Geri yükleme tamamlandı" 