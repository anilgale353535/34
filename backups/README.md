# Database Backups

Bu klasör veritabanı yedeklerini içerir.

## Yedekleme Planı
- Her gün gece yarısı otomatik yedek alınır
- Son 5 yedek saklanır
- Yedekler sıkıştırılmış SQL formatında tutulur

## Yedek Formatı
- Dosya adı formatı: `backup-YYYYMMDD_HHMMSS.sql.gz`
- Sıkıştırılmış PostgreSQL dump dosyası

## Manuel Yedek Alma
GitHub Actions sayfasından "workflow_dispatch" eventi ile manuel olarak yedek alınabilir.

## Yedekleri Geri Yükleme
1. İlgili .gz dosyasını indirin
2. Sıkıştırmayı açın: `gunzip backup-*.sql.gz`
3. Veritabanına geri yükleyin: `psql DATABASE_URL < backup-*.sql` 