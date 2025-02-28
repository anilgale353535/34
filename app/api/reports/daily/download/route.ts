import { NextResponse } from 'next/server';
import { NextRequest } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { startOfDay, endOfDay } from 'date-fns';

export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const url = new URL(request.url);
    const date = url.searchParams.get('date') || new Date().toISOString().split('T')[0];

    const startDate = startOfDay(new Date(date));
    const endDate = endOfDay(new Date(date));

    // Önce kullanıcının ürünlerini bul
    const userProducts = await prisma.$queryRaw`
      SELECT id FROM "Product" WHERE "userId" = ${user.id}
    `;

    const productIds = (userProducts as { id: string }[]).map(p => p.id);

    // Tüm stok hareketlerini getir (sayfalama olmadan)
    const movements = await prisma.stockMovement.findMany({
      where: {
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
        productId: {
          in: productIds
        }
      },
      include: {
        product: {
          select: {
            name: true,
            unit: true,
            purchasePrice: true,
            sellingPrice: true,
            category: true,
            supplier: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Özet bilgileri hesapla
    const summary = movements.reduce(
      (acc, movement) => {
        if (movement.type === 'STOCK_IN') {
          acc.totalStockIn += movement.quantity;
          acc.totalPurchase += movement.quantity * movement.product.purchasePrice;
        } else {
          acc.totalStockOut += movement.quantity;
          acc.totalSale += movement.quantity * movement.product.sellingPrice;
        }
        return acc;
      },
      {
        totalStockIn: 0,
        totalStockOut: 0,
        totalPurchase: 0,
        totalSale: 0,
        profit: 0,
      }
    );

    summary.profit = summary.totalSale - summary.totalPurchase;

    // CSV formatında veriyi hazırla
    const csvRows = [
      // Başlık satırı
      ['Tarih', 'Saat', 'Ürün', 'İşlem', 'Miktar', 'Birim', 'Birim Fiyat', 'Toplam Tutar', 'Açıklama'].join(','),
      // Veri satırları
      ...movements.map(m => [
        new Date(m.createdAt).toLocaleDateString('tr-TR'),
        new Date(m.createdAt).toLocaleTimeString('tr-TR'),
        m.product.name,
        m.type === 'STOCK_IN' ? 'Giriş' : 'Çıkış',
        m.quantity,
        m.product.unit,
        m.type === 'STOCK_IN' 
          ? m.product.purchasePrice.toFixed(2) 
          : m.product.sellingPrice.toFixed(2),
        m.type === 'STOCK_IN'
          ? (m.quantity * m.product.purchasePrice).toFixed(2)
          : (m.quantity * m.product.sellingPrice).toFixed(2),
        m.description || ''
      ].map(cell => `"${cell}"`).join(',')),
      // Boş satır
      '',
      // Özet bilgileri
      ['Özet Bilgiler'].join(','),
      ['Toplam Stok Girişi', summary.totalStockIn].join(','),
      ['Toplam Stok Çıkışı', summary.totalStockOut].join(','),
      ['Toplam Alış (₺)', summary.totalPurchase.toFixed(2)].join(','),
      ['Toplam Satış (₺)', summary.totalSale.toFixed(2)].join(','),
      ['Kar (₺)', summary.profit.toFixed(2)].join(','),
    ].join('\n');

    // CSV dosyasını oluştur
    const response = new NextResponse(csvRows, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="rapor-${date}.csv"`,
      },
    });

    // Cookie'yi response'a ekle
    const token = request.cookies.get('token');
    if (token) {
      response.cookies.set('token', token.value);
    }

    return response;
  } catch (error) {
    console.error('Rapor indirme hatası:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
} 