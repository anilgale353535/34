import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createGunzip } from 'zlib';
import { Readable } from 'stream';

// Veri tiplerini tanımla
type RestoreDataType = 'user' | 'product' | 'stockMovement' | 'alert' | 'auditLog';

export async function POST(request: NextRequest) {
  try {
    // API key kontrolü
    const apiKey = request.headers.get('x-api-key');
    if (!process.env.BACKUP_API_KEY || apiKey !== process.env.BACKUP_API_KEY) {
      return NextResponse.json(
        { error: 'Geçersiz API anahtarı' },
        { status: 401 }
      );
    }

    // Content-Type kontrolü
    if (!request.headers.get('content-type')?.includes('application/gzip')) {
      return NextResponse.json(
        { error: 'Geçersiz içerik tipi. Sıkıştırılmış JSON dosyası (application/gzip) gerekli.' },
        { status: 400 }
      );
    }

    // Veri tipini al
    const type = request.nextUrl.searchParams.get('type') as RestoreDataType;
    if (!type || !['user', 'product', 'stockMovement', 'alert', 'auditLog'].includes(type)) {
      return NextResponse.json({
        error: 'Geçerli bir veri tipi belirtilmeli',
        availableTypes: ['user', 'product', 'stockMovement', 'alert', 'auditLog']
      }, { status: 400 });
    }

    // Gzip veriyi çöz
    const buffer = await request.arrayBuffer();
    const gunzip = createGunzip();
    const chunks: Buffer[] = [];

    await new Promise((resolve, reject) => {
      const readable = Readable.from(Buffer.from(buffer));
      readable.pipe(gunzip)
        .on('data', chunk => chunks.push(Buffer.from(chunk)))
        .on('end', resolve)
        .on('error', reject);
    });

    const jsonData = Buffer.concat(chunks).toString('utf-8');
    const data = JSON.parse(jsonData);

    if (!Array.isArray(data)) {
      return NextResponse.json(
        { error: 'Geçersiz veri formatı. Dizi bekleniyor.' },
        { status: 400 }
      );
    }

    // Verileri doğrula ve temizle
    const cleanData = data.map(item => {
      const cleaned = { ...item };
      delete cleaned.id; // ID'leri yeni oluşturulsun
      return cleaned;
    });

    // Transaction ile verileri yükle
    const result = await prisma.$transaction(async (tx) => {
      // Önce mevcut verileri sil (soft delete)
      if (type === 'product') {
        await tx.product.updateMany({
          where: { isDeleted: false },
          data: { isDeleted: true }
        });
      }

      // @ts-expect-error - Prisma dynamic access
      const created = await tx[type].createMany({
        data: cleanData,
        skipDuplicates: true
      });

      return created;
    });

    return NextResponse.json({
      success: true,
      message: `${result.count} kayıt başarıyla yüklendi`,
      type,
      count: result.count
    });

  } catch (error) {
    console.error('Geri yükleme hatası:', error);
    return NextResponse.json(
      { error: 'Veriler geri yüklenirken bir hata oluştu' },
      { status: 500 }
    );
  }
} 