import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import { createAuditLog } from '@/lib/auditLogger';
import { eventBus, EVENT_TYPES } from '@/lib/eventBus';
import { prisma } from '@/lib/prisma';
import { normalizeUnit } from '@/lib/units';
import { Prisma } from '@prisma/client';

// Tüm ürünleri getir
export async function GET(request: Request) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json(
        { message: 'Yetkilendirme hatası' },
        { status: 401 }
      );
    }

    const products = await prisma.product.findMany({
      where: { 
        userId: user.id,
        isDeleted: false
      },
      orderBy: {
        name: 'asc'
      }
    });

    return NextResponse.json(products);
  } catch (error) {
    console.error('Ürünler listelenirken hata:', error);
    return NextResponse.json(
      { message: 'Ürünler listelenirken bir hata oluştu' },
      { status: 500 }
    );
  }
}

// Yeni ürün ekle
export async function POST(request: Request) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json(
        { message: 'Yetkilendirme hatası' },
        { status: 401 }
      );
    }

    const data = await request.json();

    // Sayısal değerleri number tipine dönüştür
    const formattedData = {
      ...data,
      purchasePrice: Number(data.purchasePrice),
      sellingPrice: Number(data.sellingPrice),
      currentStock: Number(data.currentStock),
      minimumStock: Number(data.minimumStock),
      userId: user.id, // Kullanıcı ID'sini ekle
    };

    // Validasyonlar
    if (formattedData.purchasePrice < 0) {
      return NextResponse.json(
        { message: 'Alış fiyatı negatif olamaz' },
        { status: 400 }
      );
    }

    if (formattedData.sellingPrice < 0) {
      return NextResponse.json(
        { message: 'Satış fiyatı negatif olamaz' },
        { status: 400 }
      );
    }

    if (formattedData.currentStock < 0) {
      return NextResponse.json(
        { message: 'Stok miktarı negatif olamaz' },
        { status: 400 }
      );
    }

    if (formattedData.minimumStock < 0) {
      return NextResponse.json(
        { message: 'Minimum stok miktarı negatif olamaz' },
        { status: 400 }
      );
    }

    if (formattedData.sellingPrice <= formattedData.purchasePrice) {
      return NextResponse.json(
        { message: 'Satış fiyatı alış fiyatından düşük veya eşit olamaz' },
        { status: 400 }
      );
    }

    // Eğer barkod varsa, benzersiz olup olmadığını kontrol et
    if (formattedData.barcode) {
      // Barkod formatını kontrol et (sadece sayı ve harf)
      if (!/^[A-Za-z0-9]+$/.test(formattedData.barcode)) {
        return NextResponse.json(
          { message: 'Barkod sadece harf ve rakamlardan oluşmalıdır' },
          { status: 400 }
        );
      }

      const existingProduct = await prisma.product.findFirst({
        where: { 
          barcode: formattedData.barcode,
          userId: user.id
        },
      });

      if (existingProduct) {
        return NextResponse.json(
          { message: 'Bu barkoda sahip bir ürün zaten mevcut' },
          { status: 400 }
        );
      }
    }

    // Zorunlu alanları kontrol et
    if (!formattedData.name?.trim()) {
      return NextResponse.json(
        { message: 'Ürün adı zorunludur' },
        { status: 400 }
      );
    }

    if (!formattedData.category?.trim()) {
      return NextResponse.json(
        { message: 'Kategori zorunludur' },
        { status: 400 }
      );
    }

    if (!formattedData.unit?.trim()) {
      return NextResponse.json(
        { message: 'Birim zorunludur' },
        { status: 400 }
      );
    }

    // Birim kontrolü
    const normalizedUnit = normalizeUnit(formattedData.unit);
    if (!normalizedUnit) {
      return NextResponse.json(
        { message: `Geçersiz birim türü. Geçerli birimler: adet, kg, lt, mt, kutu, paket` },
        { status: 400 }
      );
    }

    // Normalize edilmiş birimi kullan
    formattedData.unit = normalizedUnit;

    const product = await prisma.product.create({
      data: formattedData,
    });

    // Audit log oluştur
    await createAuditLog({
      action: 'CREATE',
      entityType: 'Product',
      entityId: product.id,
      userId: user.id,
      details: { ...formattedData }
    });

    // Event'i tetikle
    eventBus.publish(EVENT_TYPES.PRODUCT_CREATED);

    return NextResponse.json(product);
  } catch (error) {
    console.error('Ürün eklenirken hata:', error);

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      // Benzersiz alan hatası (örn: barkod)
      if (error.code === 'P2002') {
        return NextResponse.json(
          { message: 'Bu barkoda sahip bir ürün zaten mevcut' },
          { status: 400 }
        );
      }
    }

    return NextResponse.json(
      { message: 'Ürün eklenirken bir hata oluştu' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ message: 'Yetkilendirme hatası' }, { status: 401 });
    }

    const data = await request.json();
    const { id, ...updateData } = data;

    const product = await prisma.product.update({
      where: { id },
      data: updateData
    });

    // Audit log oluştur
    await createAuditLog({
      action: 'UPDATE',
      entityType: 'Product',
      entityId: product.id,
      userId: user.id,
      details: {
        oldData: data,
        newData: product
      }
    });

    // Event'i tetikle
    eventBus.publish(EVENT_TYPES.PRODUCT_UPDATED);

    return NextResponse.json(product);
  } catch (error) {
    console.error('Ürün güncellenirken hata:', error);
    return NextResponse.json(
      { message: 'Ürün güncellenirken bir hata oluştu' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ message: 'Yetkilendirme hatası' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ message: 'ID parametresi gerekli' }, { status: 400 });
    }

    const product = await prisma.product.delete({
      where: { id }
    });

    // Audit log oluştur
    await createAuditLog({
      action: 'DELETE',
      entityType: 'Product',
      entityId: product.id,
      userId: user.id,
      details: product
    });

    // Event'i tetikle
    eventBus.publish(EVENT_TYPES.PRODUCT_DELETED);

    return NextResponse.json(product);
  } catch (error) {
    console.error('Ürün silinirken hata:', error);
    return NextResponse.json(
      { message: 'Ürün silinirken bir hata oluştu' },
      { status: 500 }
    );
  }
} 