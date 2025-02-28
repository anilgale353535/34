import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserFromRequest } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 });
    }

    // Stok seviyesi minimum seviyenin altında olan ürünleri bul
    const lowStockProducts = await prisma.product.findMany({
      where: {
        userId: user.id,
        stockQuantity: {
          lte: prisma.product.fields.minimumStockLevel,
        },
      },
    });

    const alerts = [];
    for (const product of lowStockProducts) {
      // Her ürün için bildirim oluştur
      const alert = await prisma.alert.create({
        data: {
          userId: user.id,
          productId: product.id,
          message: `${product.name} ürününün stok seviyesi minimum seviyenin altına düştü. Mevcut stok: ${product.stockQuantity}, Minimum seviye: ${product.minimumStockLevel}`,
          isRead: false,
        },
      });
      alerts.push(alert);
    }

    return NextResponse.json({
      message: `${alerts.length} adet düşük stok bildirimi oluşturuldu`,
      alerts,
    });
  } catch (error) {
    console.error('Stok kontrol bildirimleri oluşturulurken hata:', error);
    return NextResponse.json(
      { error: 'Stok kontrol bildirimleri oluşturulurken bir hata oluştu' },
      { status: 500 }
    );
  }
} 