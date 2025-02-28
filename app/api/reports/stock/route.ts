import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserFromRequest } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Yetkilendirme hatası' }, { status: 401 });
    }

    const products = await prisma.product.findMany({
      where: {
        userId: user.id
      },
      select: {
        name: true,
        category: true,
        currentStock: true,
        minimumStock: true,
        unit: true,
        purchasePrice: true,
        sellingPrice: true,
        supplier: true,
      },
      orderBy: {
        name: 'asc',
      },
    });

    // Excel için veriyi formatla
    const reportData = products.map(product => ({
      'Ürün Adı': product.name,
      'Kategori': product.category,
      'Mevcut Stok': product.currentStock,
      'Minimum Stok': product.minimumStock,
      'Birim': product.unit,
      'Alış Fiyatı': product.purchasePrice,
      'Satış Fiyatı': product.sellingPrice,
      'Stok Değeri': product.currentStock * product.purchasePrice,
      'Tedarikçi': product.supplier || '-',
      'Durum': product.currentStock <= product.minimumStock ? 'Kritik' : 'Normal',
    }));

    return NextResponse.json(reportData);
  } catch (error) {
    console.error('Stok raporu hatası:', error);
    return NextResponse.json(
      { error: 'Stok raporu oluşturulurken bir hata oluştu' },
      { status: 500 }
    );
  }
} 