import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserFromRequest } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Yetkilendirme hatası' }, { status: 401 });
    }

    // Toplam ürün sayısı
    const totalProducts = await prisma.product.count({
      where: {
        userId: user.id
      }
    });

    // Toplam stok değeri
    const products = await prisma.product.findMany({
      where: {
        userId: user.id
      },
      select: {
        currentStock: true,
        purchasePrice: true,
      },
    });
    
    const totalStockValue = products.reduce(
      (total, product) => total + (product.currentStock * product.purchasePrice),
      0
    );

    // Bugünkü satışlar
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayMovements = await prisma.stockMovement.findMany({
      where: {
        type: 'STOCK_OUT',
        reason: 'SALE',
        createdAt: {
          gte: today
        },
        product: {
          userId: user.id
        }
      },
      include: {
        product: {
          select: {
            sellingPrice: true
          }
        }
      }
    });

    const todaySalesCount = todayMovements.length;
    const todaySalesAmount = todayMovements.reduce((total, movement) => {
      return total + (movement.quantity * movement.product.sellingPrice);
    }, 0);

    // Kritik stok sayısı
    const criticalStockCount = await prisma.product.count({
      where: {
        userId: user.id,
        currentStock: {
          lte: prisma.product.fields.minimumStock,
        },
      },
    });

    return NextResponse.json({
      totalProducts,
      totalStockValue,
      todaySalesCount,
      todaySalesAmount,
      criticalStockCount,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Bilinmeyen hata';
    console.error('Dashboard stats error:', errorMessage);
    return NextResponse.json(
      { error: 'İstatistikler alınırken bir hata oluştu' },
      { status: 500 }
    );
  }
} 