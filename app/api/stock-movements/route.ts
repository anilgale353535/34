import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserFromRequest } from '@/lib/auth';
import { createAuditLog } from '@/lib/auditLogger';
import { eventBus, EVENT_TYPES } from '@/lib/eventBus';
import { MovementType } from '@prisma/client';
import { UNITS, UnitType, normalizeUnit } from '@/lib/units';

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
      return NextResponse.json(
        { message: 'Yetkilendirme hatası' },
        { status: 401 }
      );
    }

    const data = await request.json();
    
    // Debug: Gelen veriyi logla
    console.log('Gelen veri:', data);

    // Ürünü bul
    const product = await prisma.product.findFirst({
      where: {
        id: data.productId,
        userId: user.id,
      },
    });

    // Debug: Bulunan ürünü logla
    console.log('Bulunan ürün:', product);

    if (!product) {
      return NextResponse.json(
        { message: 'Ürün bulunamadı' },
        { status: 404 }
      );
    }

    // Miktar validasyonu
    const quantity = Number(data.quantity);
    if (isNaN(quantity) || quantity <= 0) {
      return NextResponse.json(
        { message: 'Geçersiz miktar' },
        { status: 400 }
      );
    }

    // Debug: Birim kontrolü
    console.log('Ürün birimi:', product.unit);
    console.log('Tanımlı birimler:', Object.keys(UNITS));

    // Birim türüne göre ondalık kontrolü
    const normalizedUnit = normalizeUnit(product.unit);
    
    // Birim tipini kontrol et
    if (!normalizedUnit) {
      return NextResponse.json(
        { message: `Geçersiz birim türü: ${product.unit}. Geçerli birimler: ${Object.keys(UNITS).join(', ')}` },
        { status: 400 }
      );
    }

    // Tam sayı kontrolü
    if (!UNITS[normalizedUnit].decimal && !Number.isInteger(quantity)) {
      return NextResponse.json(
        { message: `${UNITS[normalizedUnit].label} için sadece tam sayı girebilirsiniz` },
        { status: 400 }
      );
    }

    // Stok çıkışı için yeterli stok kontrolü
    if (data.type === 'STOCK_OUT' && product.currentStock < quantity) {
      return NextResponse.json(
        { message: 'Yetersiz stok' },
        { status: 400 }
      );
    }

    // Stok hareketini kaydet
    const stockMovement = await prisma.stockMovement.create({
      data: {
        type: data.type as MovementType,
        reason: data.reason,
        quantity,
        description: data.description,
        productId: product.id,
      },
    });

    // Ürün stok miktarını güncelle
    const updatedProduct = await prisma.product.update({
      where: { id: product.id },
      data: {
        currentStock: data.type === 'STOCK_IN'
          ? product.currentStock + quantity
          : product.currentStock - quantity,
      },
    });

    // Audit log oluştur
    await createAuditLog({
      action: 'CREATE',
      entityType: 'StockMovement',
      entityId: stockMovement.id,
      userId: user.id,
      details: {
        movementType: data.type,
        quantity,
        reason: data.reason,
        description: data.description,
        productId: product.id,
        oldStock: product.currentStock,
        newStock: updatedProduct.currentStock
      }
    });

    // Event'i tetikle
    eventBus.publish(EVENT_TYPES.STOCK_MOVEMENT_CREATED);

    return NextResponse.json(stockMovement);
  } catch (error) {
    console.error('Stok hareketi oluşturulurken hata:', error);
    return NextResponse.json(
      { message: 'Stok hareketi kaydedilirken bir hata oluştu' },
      { status: 500 }
    );
  }
} 