import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserFromRequest } from '@/lib/auth';
import { createAuditLog } from '@/lib/auditLogger';
import { eventBus, EVENT_TYPES } from '@/lib/eventBus';

// Stok artıran hareket tipi
const STOCK_IN = 'STOCK_IN';

// Stok azaltan hareket tipi
const STOCK_OUT = 'STOCK_OUT';

export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Yetkilendirme hatası' }, { status: 401 });
    }

    const movements = await prisma.stockMovement.findMany({
      where: {
        product: {
          userId: user.id
        }
      },
      include: {
        product: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json(movements);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Bilinmeyen hata';
    console.error('Stok hareketleri yüklenirken hata:', errorMessage);
    return NextResponse.json(
      { error: 'Stok hareketleri yüklenirken bir hata oluştu' },
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
    const { productId, type, reason, quantity, description } = data;

    // Temel validasyonlar
    if (!productId || !type || !reason || !quantity) {
      return NextResponse.json(
        { error: 'Ürün, hareket tipi, sebep ve miktar zorunludur' },
        { status: 400 }
      );
    }

    if (quantity <= 0) {
      return NextResponse.json(
        { error: 'Miktar 0\'dan büyük olmalıdır' },
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

    // Hareket tipini kontrol et
    if (![STOCK_IN, STOCK_OUT].includes(type)) {
      return NextResponse.json(
        { error: 'Geçersiz hareket tipi' },
        { status: 400 }
      );
    }

    // Çıkış hareketlerinde stok kontrolü
    if (type === STOCK_OUT && product.currentStock < quantity) {
      return NextResponse.json(
        { error: 'Yetersiz stok' },
        { status: 400 }
      );
    }

    // Transaction ile stok hareketi ve ürün güncelleme
    const result = await prisma.$transaction(async (tx) => {
      // Stok hareketini kaydet
      const movement = await tx.stockMovement.create({
        data: {
          type,
          reason,
          quantity,
          description,
          productId
        },
      });

      // Ürün stok miktarını güncelle
      const newStock = type === STOCK_IN
        ? product.currentStock + quantity
        : product.currentStock - quantity;

      const updatedProduct = await tx.product.update({
        where: { id: productId },
        data: { currentStock: newStock },
      });

      // Audit log oluştur
      await createAuditLog({
        action: 'CREATE',
        entityType: 'StockMovement',
        entityId: movement.id,
        userId: user.id,
        details: {
          movementType: type,
          quantity,
          reason,
          description,
          productId,
          oldStock: product.currentStock,
          newStock
        }
      });

      return { movement, updatedProduct };
    });

    // Event'i tetikle
    eventBus.publish(EVENT_TYPES.STOCK_MOVEMENT_CREATED);

    return NextResponse.json(result.movement);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Bilinmeyen hata';
    console.error('Stok hareketi kaydedilirken hata:', errorMessage);
    return NextResponse.json(
      { error: 'Stok hareketi kaydedilirken bir hata oluştu' },
      { status: 500 }
    );
  }
} 