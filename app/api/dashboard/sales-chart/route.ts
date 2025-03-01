import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserFromRequest } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json(
        { message: 'Yetkilendirme hatası' },
        { status: 401 }
      );
    }

    // Son 7 günün tarihlerini oluştur
    const dates = Array.from({ length: 7 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);
      return date;
    }).reverse();

    // Her gün için satış verilerini al
    const salesData = await Promise.all(
      dates.map(async (date) => {
        const nextDate = new Date(date);
        nextDate.setDate(nextDate.getDate() + 1);

        const movements = await prisma.stockMovement.findMany({
          where: {
            type: 'STOCK_OUT',
            reason: 'SALE',
            createdAt: {
              gte: date,
              lt: nextDate,
            },
            product: {
              userId: user.id,
            },
          },
          include: {
            product: true,
          },
        });

        // Günlük toplam satış tutarını hesapla
        const totalAmount = movements.reduce((sum, movement) => {
          return sum + (movement.quantity * movement.product.sellingPrice);
        }, 0);

        return {
          date: date.toISOString().split('T')[0],
          amount: totalAmount,
        };
      })
    );

    return NextResponse.json(salesData);
  } catch (error) {
    console.error('Satış verileri yüklenirken hata:', error);
    return NextResponse.json(
      { message: 'Satış verileri yüklenirken bir hata oluştu' },
      { status: 500 }
    );
  }
} 