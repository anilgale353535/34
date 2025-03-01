import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

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

    // Tüm verileri çek
    const data = {
      users: await prisma.user.findMany(),
      products: await prisma.product.findMany(),
      stockMovements: await prisma.stockMovement.findMany(),
      alerts: await prisma.alert.findMany(),
      auditLogs: await prisma.auditLog.findMany()
    };

    console.log('Veriler başarıyla çekildi');

    // JSON dosyası olarak gönder
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `backup-${timestamp}.json`;

    const responseHeaders = new Headers();
    responseHeaders.set('Content-Type', 'application/json');
    responseHeaders.set('Content-Disposition', `attachment; filename="${filename}"`);

    return new NextResponse(JSON.stringify(data, null, 2), {
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