import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserFromRequest } from '@/lib/auth';
import { createAuditLog } from '@/lib/auditLogger';
import { eventBus, EVENT_TYPES } from '@/lib/eventBus';

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
        id: true,
        quantity: true,
        unitPrice: true,
        totalPrice: true,
        description: true,
        createdAt: true,
        product: {
          select: {
            name: true,
            unit: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json(sales);
  } catch (error) {
    console.error('Satışlar yüklenirken hata:', error);
    return NextResponse.json(
      { error: 'Satışlar yüklenirken bir hata oluştu' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Yetkilendirme hatası' }, { status: 401 });
    }

    const data = await request.json();
    const { productId, quantity, unitPrice, totalPrice, description } = data;

    // Temel validasyonlar
    if (!productId || !quantity || !unitPrice || !totalPrice) {
      return NextResponse.json(
        { error: 'Ürün, miktar ve fiyat bilgileri zorunludur' },
        { status: 400 }
      );
    }

    if (quantity <= 0) {
      return NextResponse.json(
        { error: 'Miktar 0\'dan büyük olmalıdır' },
        { status: 400 }
      );
    }

    if (unitPrice <= 0) {
      return NextResponse.json(
        { error: 'Birim fiyat 0\'dan büyük olmalıdır' },
        { status: 400 }
      );
    }

    // Ürünü kontrol et
    const product = await prisma.product.findFirst({
      where: {
        id: productId,
        userId: user.id
      }
    });

    if (!product) {
      return NextResponse.json(
        { error: 'Ürün bulunamadı' },
        { status: 404 }
      );
    }

    // Stok kontrolü
    if (product.currentStock < quantity) {
      return NextResponse.json(
        { error: 'Yetersiz stok' },
        { status: 400 }
      );
    }

    // Transaction ile satış ve stok güncelleme
    const result = await prisma.$transaction(async (tx) => {
      // Stok hareketi oluştur
      const movement = await tx.stockMovement.create({
        data: {
          type: 'STOCK_OUT',
          reason: 'SALE',
          quantity,
          unitPrice,
          totalPrice,
          description,
          productId
        },
      });

      // Ürün stok miktarını güncelle
      const updatedProduct = await tx.product.update({
        where: { id: productId },
        data: { currentStock: product.currentStock - quantity },
      });

      // Audit log oluştur
      await createAuditLog({
        action: 'CREATE',
        entityType: 'Sale',
        entityId: movement.id,
        userId: user.id,
        details: {
          quantity,
          unitPrice,
          totalPrice,
          description,
          productId,
          oldStock: product.currentStock,
          newStock: product.currentStock - quantity
        }
      });

      return { movement, updatedProduct };
    });

    // Event'i tetikle
    eventBus.publish(EVENT_TYPES.SALE_CREATED);

    return NextResponse.json(result.movement);
  } catch (error) {
    console.error('Satış kaydedilirken hata:', error);
    return NextResponse.json(
      { error: 'Satış kaydedilirken bir hata oluştu' },
      { status: 500 }
    );
  }
} 