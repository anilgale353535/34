import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserFromRequest } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Yetkilendirme hatası' }, { status: 401 });
    }

    const criticalStocks = await prisma.product.findMany({
      where: {
        userId: user.id,
        currentStock: {
          lte: prisma.product.fields.minimumStock
        },
      },
      select: {
        id: true,
        name: true,
        currentStock: true,
        minimumStock: true,
        unit: true,
      },
      orderBy: {
        name: 'asc',
      },
    });

    return NextResponse.json(criticalStocks);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Bilinmeyen hata';
    console.error('Critical stocks error:', errorMessage);
    return NextResponse.json(
      { error: 'Kritik stok seviyeleri alınırken bir hata oluştu' },
      { status: 500 }
    );
  }
} 