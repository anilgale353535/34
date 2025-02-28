import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserFromRequest } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Yetkilendirme hatası' }, { status: 401 });
    }

    const sales = await prisma.stockMovement.findMany({
      where: {
        type: 'STOCK_OUT',
        reason: 'SALE',
        product: {
          userId: user.id
        }
      },
      select: {
        createdAt: true,
        quantity: true,
        unitPrice: true,
        totalPrice: true,
        description: true,
        product: {
          select: {
            name: true,
            unit: true,
            category: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Excel için veriyi formatla
    const reportData = sales.map(sale => ({
      'Tarih': new Date(sale.createdAt).toLocaleString('tr-TR'),
      'Ürün': sale.product.name,
      'Kategori': sale.product.category,
      'Miktar': sale.quantity,
      'Birim': sale.product.unit,
      'Birim Fiyat': sale.unitPrice,
      'Toplam Tutar': sale.totalPrice,
      'Açıklama': sale.description || '-',
    }));

    return NextResponse.json(reportData);
  } catch (error) {
    console.error('Satış raporu hatası:', error);
    return NextResponse.json(
      { error: 'Satış raporu oluşturulurken bir hata oluştu' },
      { status: 500 }
    );
  }
} 