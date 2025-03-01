import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createGzip } from 'zlib';
import { promisify } from 'util';

const gzip = promisify(createGzip);

// Veri tiplerini tanımla
type BackupDataType = 'user' | 'product' | 'stockMovement' | 'alert' | 'auditLog';

export async function GET(request: NextRequest) {
  try {
    console.log('Backup isteği alındı');
    
    // Tüm headers'ı logla
    const requestHeaders = Object.fromEntries(request.headers.entries());
    console.log('Gelen headers:', requestHeaders);
    
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

    // İstenen veri tipini al ve doğrula
    const requestedType = request.nextUrl.searchParams.get('type');
    const page = parseInt(request.nextUrl.searchParams.get('page') || '1');
    const pageSize = 1000; // Her sayfada 1000 kayıt

    // Tip kontrolü
    if (!requestedType || !['user', 'product', 'stockMovement', 'alert', 'auditLog'].includes(requestedType)) {
      return NextResponse.json({
        availableTypes: ['user', 'product', 'stockMovement', 'alert', 'auditLog'],
        message: 'Lütfen geçerli bir backup tipi belirtin: ?type=<tip>'
      });
    }

    const type = requestedType as BackupDataType;
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
    const compressedBuffer = await gzip(Buffer.from(jsonData));

    // Response headers
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `backup-${type}-${page}-of-${totalPages}-${timestamp}.json.gz`;

    const responseHeaders = new Headers();
    responseHeaders.append('Content-Type', 'application/gzip');
    responseHeaders.append('Content-Disposition', `attachment; filename="${filename}"`);
    responseHeaders.append('X-Total-Pages', totalPages.toString());
    responseHeaders.append('X-Current-Page', page.toString());
    responseHeaders.append('X-Total-Records', total.toString());

    return new NextResponse(compressedBuffer, {
      status: 200,
      headers: responseHeaders
    });

  } catch (error) {
    console.error('Yedekleme hatası:', error);
    return NextResponse.json(
      { error: 'Yedekleme sırasında bir hata oluştu' },
      { status: 500 }
    );
  }
} 