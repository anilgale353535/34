import { NextResponse } from 'next/server';
import { NextRequest } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    // Önce ürünün kullanıcıya ait olup olmadığını kontrol et
    const product = await prisma.$queryRaw`
      SELECT id FROM "Product"
      WHERE id = ${params.id}
      AND "userId" = ${user.id}
      LIMIT 1
    `;

    if (!product || !Array.isArray(product) || product.length === 0) {
      return new NextResponse('Product not found', { status: 404 });
    }

    // Stok hareketlerini getir
    const movements = await prisma.stockMovement.findMany({
      where: {
        productId: params.id
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    return NextResponse.json(movements);
  } catch (error) {
    console.error('Stok hareketleri getirilirken hata:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
} 