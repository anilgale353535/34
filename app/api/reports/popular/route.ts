import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserFromRequest } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Yetkilendirme hatası' }, { status: 401 });
    }

    // Son 30 günlük satışları analiz et
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const productSales = await prisma.product.findMany({
      where: {
        userId: user.id,
      },
      select: {
        name: true,
        category: true,
        currentStock: true,
        unit: true,
        movements: {
          where: {
            type: 'STOCK_OUT',
            reason: 'SALE',
            createdAt: {
              gte: thirtyDaysAgo,
            },
          },
          select: {
            quantity: true,
            totalPrice: true,
          },
        },
      },
    });

    // Satış istatistiklerini hesapla
    const reportData = productSales.map(product => {
      const totalQuantity = product.movements.reduce((sum, m) => sum + m.quantity, 0);
      const totalRevenue = product.movements.reduce((sum, m) => sum + (m.totalPrice || 0), 0);

      return {
        'Ürün Adı': product.name,
        'Kategori': product.category,
        'Toplam Satış Adedi': totalQuantity,
        'Toplam Satış Tutarı': totalRevenue,
        'Mevcut Stok': product.currentStock,
        'Birim': product.unit,
        'Günlük Ortalama Satış': (totalQuantity / 30).toFixed(2),
        'Stok Yeterlilik (Gün)': totalQuantity > 0 ? Math.round((product.currentStock / (totalQuantity / 30))) : '-',
      };
    });

    // Satış miktarına göre sırala
    reportData.sort((a, b) => b['Toplam Satış Adedi'] - a['Toplam Satış Adedi']);

    return NextResponse.json(reportData);
  } catch (error) {
    console.error('Popüler ürünler raporu hatası:', error);
    return NextResponse.json(
      { error: 'Popüler ürünler raporu oluşturulurken bir hata oluştu' },
      { status: 500 }
    );
  }
} 