import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    // API key kontrolü
    const apiKey = request.headers.get('x-api-key');
    if (!process.env.BACKUP_API_KEY || apiKey !== process.env.BACKUP_API_KEY) {
      console.log('API Key hatalı:', {
        received: apiKey,
        expected: process.env.BACKUP_API_KEY
      });
      return NextResponse.json(
        { error: 'Geçersiz API anahtarı' },
        { status: 401 }
      );
    }

    // Tüm verileri çek
    const data = {
      users: await prisma.user.findMany(),
      products: await prisma.product.findMany(),
      stockMovements: await prisma.stockMovement.findMany(),
      alerts: await prisma.alert.findMany(),
      auditLogs: await prisma.auditLog.findMany()
    };

    // JSON dosyası olarak gönder
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `backup-${timestamp}.json`;

    const headers = new Headers();
    headers.set('Content-Type', 'application/json');
    headers.set('Content-Disposition', `attachment; filename="${filename}"`);

    return new NextResponse(JSON.stringify(data, null, 2), {
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