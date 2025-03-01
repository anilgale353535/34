import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createGzip } from 'zlib';
import { promisify } from 'util';

const gzip = promisify(createGzip);

// Veri tiplerini tanımla
type BackupDataType = 'user' | 'product' | 'stockMovement' | 'alert' | 'auditLog';

// Her model için select tanımlamaları
const selectFields = {
  user: {
    id: true,
    username: true,
    name: true,
    email: true,
    createdAt: true,
    updatedAt: true
  },
  product: {
    id: true,
    name: true,
    barcode: true,
    category: true,
    purchasePrice: true,
    sellingPrice: true,
    currentStock: true,
    minimumStock: true,
    unit: true,
    description: true,
    supplier: true,
    createdAt: true,
    updatedAt: true,
    userId: true
  },
  stockMovement: {
    id: true,
    type: true,
    reason: true,
    quantity: true,
    unitPrice: true,
    totalPrice: true,
    description: true,
    productId: true,
    createdAt: true,
    updatedAt: true
  },
  alert: {
    id: true,
    message: true,
    isRead: true,
    userId: true,
    productId: true,
    createdAt: true
  },
  auditLog: {
    id: true,
    action: true,
    entityType: true,
    entityId: true,
    userId: true,
    details: true,
    createdAt: true
  }
};

export async function GET(request: NextRequest) {
  try {
    console.log('Backup isteği alındı');
    
    const requestHeaders = Object.fromEntries(request.headers.entries());
    console.log('Gelen headers:', requestHeaders);
    
    console.log('Environment variables:', {
      hasBackupKey: !!process.env.BACKUP_API_KEY,
      backupKeyLength: process.env.BACKUP_API_KEY?.length
    });

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

    const requestedType = request.nextUrl.searchParams.get('type');
    const page = parseInt(request.nextUrl.searchParams.get('page') || '1');
    const pageSize = 100; // Sayfa boyutunu küçülttük

    if (!requestedType || !Object.keys(selectFields).includes(requestedType)) {
      return NextResponse.json({
        availableTypes: Object.keys(selectFields),
        message: 'Lütfen geçerli bir backup tipi belirtin: ?type=<tip>'
      });
    }

    const type = requestedType as BackupDataType;
    console.log(`${type} verisi için backup başlatılıyor...`);

    // @ts-expect-error - Prisma dynamic access
    const total = await prisma[type].count();
    const totalPages = Math.ceil(total / pageSize);

    if (page > totalPages) {
      return NextResponse.json({
        error: 'Geçersiz sayfa numarası',
        totalPages
      });
    }

    const skip = (page - 1) * pageSize;
    // @ts-expect-error - Prisma dynamic access
    const data = await prisma[type].findMany({
      take: pageSize,
      skip,
      orderBy: { id: 'asc' },
      select: selectFields[type]
    });

    const jsonData = JSON.stringify(data);
    const gzipStream = createGzip();
    const chunks: Buffer[] = [];

    gzipStream.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
    gzipStream.write(jsonData);
    gzipStream.end();

    await new Promise((resolve) => gzipStream.on('end', resolve));
    const compressedBuffer = Buffer.concat(chunks);

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `backup-${type}-${page}-of-${totalPages}-${timestamp}.json.gz`;

    const responseHeaders = new Headers();
    responseHeaders.append('Content-Type', 'application/gzip');
    responseHeaders.append('Content-Disposition', `attachment; filename="${filename}"`);
    responseHeaders.append('X-Total-Pages', totalPages.toString());
    responseHeaders.append('X-Current-Page', page.toString());
    responseHeaders.append('X-Total-Records', total.toString());

    return new Response(compressedBuffer, {
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