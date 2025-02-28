import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getUserFromRequest } from '@/lib/auth';

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json(
        { error: 'Yetkilendirme hatası' },
        { status: 401 }
      );
    }

    const data = await request.json();
    
    if (!data || !Array.isArray(data.products) || data.products.length === 0) {
      return NextResponse.json(
        { error: 'Geçersiz veri formatı veya boş ürün listesi' },
        { status: 400 }
      );
    }

    // Tüm ürünleri tek bir transaction içinde ekle
    const result = await prisma.$transaction(async (tx) => {
      const createdProducts = [];

      for (const product of data.products) {
        // Excel'den gelen verileri uygun formata dönüştür
        const formattedProduct = {
          name: product['Ürün Adı'],
          barcode: product['Barkod'] || null,
          category: product['Kategori'],
          purchasePrice: Number(product['Alış Fiyatı']),
          sellingPrice: Number(product['Satış Fiyatı']),
          currentStock: Number(product['Mevcut Stok']),
          minimumStock: Number(product['Minimum Stok']),
          unit: product['Birim'],
          description: product['Açıklama'] || null,
          supplier: product['Tedarikçi'] || null,
          userId: user.id,
        };

        // Validasyonlar
        if (!formattedProduct.name?.trim()) {
          throw new Error(`Ürün adı zorunludur (Satır: ${data.products.indexOf(product) + 1})`);
        }

        if (!formattedProduct.category?.trim()) {
          throw new Error(`Kategori zorunludur (Satır: ${data.products.indexOf(product) + 1})`);
        }

        if (!formattedProduct.unit?.trim()) {
          throw new Error(`Birim zorunludur (Satır: ${data.products.indexOf(product) + 1})`);
        }

        if (formattedProduct.purchasePrice < 0) {
          throw new Error(`Alış fiyatı negatif olamaz (Satır: ${data.products.indexOf(product) + 1})`);
        }

        if (formattedProduct.sellingPrice < 0) {
          throw new Error(`Satış fiyatı negatif olamaz (Satır: ${data.products.indexOf(product) + 1})`);
        }

        if (formattedProduct.currentStock < 0) {
          throw new Error(`Stok miktarı negatif olamaz (Satır: ${data.products.indexOf(product) + 1})`);
        }

        if (formattedProduct.minimumStock < 0) {
          throw new Error(`Minimum stok miktarı negatif olamaz (Satır: ${data.products.indexOf(product) + 1})`);
        }

        if (formattedProduct.sellingPrice <= formattedProduct.purchasePrice) {
          throw new Error(`Satış fiyatı alış fiyatından düşük veya eşit olamaz (Satır: ${data.products.indexOf(product) + 1})`);
        }

        // Barkod kontrolü
        if (formattedProduct.barcode) {
          if (!/^[A-Za-z0-9]+$/.test(formattedProduct.barcode)) {
            throw new Error(`Barkod sadece harf ve rakamlardan oluşmalıdır (Satır: ${data.products.indexOf(product) + 1})`);
          }

          const existingProduct = await tx.product.findUnique({
            where: { barcode: formattedProduct.barcode },
          });

          if (existingProduct) {
            throw new Error(`Bu barkoda sahip bir ürün zaten mevcut (Satır: ${data.products.indexOf(product) + 1})`);
          }
        }

        const createdProduct = await tx.product.create({
          data: formattedProduct,
        });

        createdProducts.push(createdProduct);
      }

      return createdProducts;
    });

    return NextResponse.json({
      success: true,
      message: `${result.length} ürün başarıyla içe aktarıldı`,
      products: result,
    });
  } catch (error) {
    console.error('Ürün import hatası:', error);
    return NextResponse.json(
      { 
        success: false,
        error: error instanceof Error ? error.message : 'Ürünler içe aktarılırken bir hata oluştu'
      },
      { status: 400 }
    );
  }
} 