import { NextResponse } from 'next/server';
import { NextRequest } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { startOfDay, endOfDay } from 'date-fns';

const PAGE_SIZE = 20;

interface ReportSummary {
  totalStockIn: number;
  totalStockOut: number;
  totalPurchase: number;
  totalSale: number;
  profit: number;
}

export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const url = new URL(request.url);
    const date = url.searchParams.get('date') || new Date().toISOString().split('T')[0];
    const page = parseInt(url.searchParams.get('page') || '1', 10);
    const skip = (page - 1) * PAGE_SIZE;

    const startDate = startOfDay(new Date(date));
    const endDate = endOfDay(new Date(date));

    // Önce kullanıcının ürünlerini bul
    const userProducts = await prisma.$queryRaw`
      SELECT id FROM "Product" WHERE "userId" = ${user.id}
    `;

    const productIds = (userProducts as { id: string }[]).map(p => p.id);

    // Stok hareketlerini getir
    const [movements, totalCount] = await Promise.all([
      prisma.stockMovement.findMany({
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
        skip,
        take: PAGE_SIZE,
      }),
      prisma.stockMovement.count({
        where: {
          createdAt: {
            gte: startDate,
            lte: endDate,
          },
          productId: {
            in: productIds
          }
        },
      }),
    ]);

    // Özet bilgileri hesapla
    const summary = movements.reduce<ReportSummary>(
      (acc, movement) => {
        if (movement.type === 'STOCK_IN') {
          acc.totalStockIn += movement.quantity;
          // Alış tutarı = miktar * ürünün alış fiyatı
          acc.totalPurchase += movement.quantity * movement.product.purchasePrice;
        } else {
          acc.totalStockOut += movement.quantity;
          // Satış tutarı = miktar * ürünün satış fiyatı
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

    // Her hareket için birim fiyat ve toplam tutarı hesapla
    const enrichedMovements = movements.map(movement => ({
      ...movement,
      unitPrice: movement.type === 'STOCK_IN' 
        ? movement.product.purchasePrice 
        : movement.product.sellingPrice,
      totalPrice: movement.type === 'STOCK_IN'
        ? movement.quantity * movement.product.purchasePrice
        : movement.quantity * movement.product.sellingPrice,
    }));

    summary.profit = summary.totalSale - summary.totalPurchase;

    return NextResponse.json({
      movements: enrichedMovements,
      summary,
      pagination: {
        page,
        totalPages: Math.ceil(totalCount / PAGE_SIZE),
        totalItems: totalCount,
      },
    });
  } catch (error) {
    console.error('Rapor oluşturulurken hata:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
} 