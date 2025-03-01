import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createGzip } from 'zlib';
import { Readable } from 'stream';
import { promisify } from 'util';

const gzip = promisify(createGzip);

// Veri tiplerini tanımla
type BackupDataType = 'users' | 'products' | 'stockMovements' | 'alerts' | 'auditLogs';

export async function GET(request: NextRequest) {
  try {
    console.log('Backup isteği alındı');
    
    // Tüm headers'ı logla
    const headers = Object.fromEntries(request.headers.entries());
    console.log('Gelen headers:', headers);
    
    // Environment variables'ı kontrol et
    console.log('Environment variables:', {
      hasBackupKey: !!process.env.BACKUP_API_KEY,
      backupKeyLength: process.env.BACKUP_API_KEY?.length
    });

    // API key kontrolü
    const apiKey = request.headers.get('x-api-key');
    if (!process.env.BACKUP_API_KEY || apiKey !== process.env.BACKUP_API_KEY) {
      console.log('API Key kontrolü başarısız:', {
        received: apiKey,
        expected: process.env.BACKUP_API_KEY,
        match: apiKey === process.env.BACKUP_API_KEY
      });
      return NextResponse.json(
        { error: 'Geçersiz API anahtarı' },
        { status: 401 }
      );
    }

    console.log('API Key doğrulandı, veri çekiliyor...');

    // İstenen veri tipini al
    const type = request.nextUrl.searchParams.get('type') as BackupDataType;
    const page = parseInt(request.nextUrl.searchParams.get('page') || '1');
    const pageSize = 1000; // Her sayfada 1000 kayıt

    // Eğer tip belirtilmemişse, mevcut tipleri listele
    if (!type) {
      return NextResponse.json({
        availableTypes: ['users', 'products', 'stockMovements', 'alerts', 'auditLogs'],
        message: 'Lütfen backup tipini belirtin: ?type=<tip>'
      });
    }

    console.log(`${type} verisi için backup başlatılıyor...`);

    // Toplam kayıt sayısını al
    const total = await prisma[type].count();
    const totalPages = Math.ceil(total / pageSize);

    // Sayfa numarası kontrolü
    if (page > totalPages) {
      return NextResponse.json({
        error: 'Geçersiz sayfa numarası',
        totalPages
      });
    }

    // Verileri getir
    const skip = (page - 1) * pageSize;
    const data = await prisma[type].findMany({
      take: pageSize,
      skip,
      orderBy: {
        id: 'asc'
      }
    });

    // Veriyi sıkıştır
    const jsonData = JSON.stringify(data);
    const compressedData = await gzip(jsonData);

    // Response headers
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `backup-${type}-${page}-of-${totalPages}-${timestamp}.json.gz`;

    const headers = new Headers();
    headers.set('Content-Type', 'application/gzip');
    headers.set('Content-Disposition', `attachment; filename="${filename}"`);
    headers.set('X-Total-Pages', totalPages.toString());
    headers.set('X-Current-Page', page.toString());
    headers.set('X-Total-Records', total.toString());

    return new NextResponse(compressedData, {
      status: 200,
      headers
    });

  } catch (error) {
    console.error('Yedekleme hatası:', error);
    return NextResponse.json(
      { error: 'Yedekleme sırasında bir hata oluştu' },
      { status: 500 }
    );
  }
} 