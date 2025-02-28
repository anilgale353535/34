import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getUserFromRequest } from '@/lib/auth';
import { createAuditLog } from '@/lib/auditLogger';
import { eventBus, EVENT_TYPES } from '@/lib/eventBus';

const prisma = new PrismaClient();

// Ürün detayını getir
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json(
        { message: 'Yetkilendirme hatası' },
        { status: 401 }
      );
    }

    const product = await prisma.product.findFirst({
      where: { 
        id: params.id,
        userId: user.id
      },
    });

    if (!product) {
      return NextResponse.json(
        { message: 'Ürün bulunamadı' },
        { status: 404 }
      );
    }

    return NextResponse.json(product);
  } catch (error) {
    console.error('Ürün getirilirken hata:', error);
    return NextResponse.json(
      { message: 'Ürün getirilirken bir hata oluştu' },
      { status: 500 }
    );
  }
}

// Ürün güncelle
export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json(
        { message: 'Yetkilendirme hatası' },
        { status: 401 }
      );
    }

    const data = await request.json();

    // Önce ürünün kullanıcıya ait olduğunu kontrol et
    const existingProduct = await prisma.product.findFirst({
      where: { 
        id: params.id,
        userId: user.id
      },
    });

    if (!existingProduct) {
      return NextResponse.json(
        { message: 'Ürün bulunamadı' },
        { status: 404 }
      );
    }

    const product = await prisma.product.update({
      where: { id: params.id },
      data,
    });

    // Audit log oluştur
    await createAuditLog({
      action: 'UPDATE',
      entityType: 'Product',
      entityId: params.id,
      userId: user.id,
      details: { 
        before: existingProduct,
        after: product
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

// Ürün sil
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json(
        { message: 'Yetkilendirme hatası' },
        { status: 401 }
      );
    }

    // Önce ürünün kullanıcıya ait olduğunu kontrol et
    const existingProduct = await prisma.product.findFirst({
      where: { 
        id: params.id,
        userId: user.id
      },
    });

    if (!existingProduct) {
      return NextResponse.json(
        { message: 'Ürün bulunamadı' },
        { status: 404 }
      );
    }

    // Audit log oluştur
    await createAuditLog({
      action: 'DELETE',
      entityType: 'Product',
      entityId: params.id,
      userId: user.id,
      details: { deletedProduct: existingProduct }
    });

    await prisma.product.delete({
      where: { id: params.id },
    });

    // Event'i tetikle
    eventBus.publish(EVENT_TYPES.PRODUCT_DELETED);

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error('Ürün silinirken hata:', error);
    return NextResponse.json(
      { message: 'Ürün silinirken bir hata oluştu' },
      { status: 500 }
    );
  }
} 