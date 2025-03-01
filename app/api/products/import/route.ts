import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';

interface ImportProduct {
  'Ürün Adı': string;
  'Barkod'?: string;
  'Kategori': string;
  'Alış Fiyatı': string | number;
  'Satış Fiyatı': string | number;
  'Mevcut Stok': string | number;
  'Minimum Stok': string | number;
  'Birim': string;
  'Açıklama'?: string;
  'Tedarikçi'?: string;
}

interface ImportData {
  products: ImportProduct[];
}

export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json(
        { error: 'Yetkilendirme hatası' },
        { status: 401 }
      );
    }

    const data = await request.json() as ImportData;
    
    // Gelen veriyi kontrol et ve logla
    console.log('Gelen veri:', JSON.stringify(data, null, 2));
    
    if (!data || !Array.isArray(data.products) || data.products.length === 0) {
      return NextResponse.json(
        { error: 'Geçersiz veri formatı veya boş ürün listesi' },
        { status: 400 }
      );
    }

    // Her bir ürünü ayrı ayrı işle
    const results = [];
    const errors = [];

    for (const product of data.products) {
      try {
        // Excel'den gelen verileri uygun formata dönüştür
        const formattedProduct = {
          name: String(product['Ürün Adı']).trim(),
          barcode: product['Barkod'] ? String(product['Barkod']).trim() : null,
          category: String(product['Kategori']).trim(),
          purchasePrice: Number(product['Alış Fiyatı']),
          sellingPrice: Number(product['Satış Fiyatı']),
          currentStock: Number(product['Mevcut Stok']),
          minimumStock: Number(product['Minimum Stok']),
          unit: String(product['Birim']).trim(),
          description: product['Açıklama'] ? String(product['Açıklama']).trim() : null,
          supplier: product['Tedarikçi'] ? String(product['Tedarikçi']).trim() : null,
          userId: user.id,
        };

        // Validasyonlar
        if (!formattedProduct.name) {
          throw new Error(`Ürün adı zorunludur (Satır: ${data.products.indexOf(product) + 1})`);
        }

        if (!formattedProduct.category) {
          throw new Error(`Kategori zorunludur (Satır: ${data.products.indexOf(product) + 1})`);
        }

        if (!formattedProduct.unit) {
          throw new Error(`Birim zorunludur (Satır: ${data.products.indexOf(product) + 1})`);
        }

        if (isNaN(formattedProduct.purchasePrice) || formattedProduct.purchasePrice < 0) {
          throw new Error(`Geçersiz alış fiyatı (Satır: ${data.products.indexOf(product) + 1})`);
        }

        if (isNaN(formattedProduct.sellingPrice) || formattedProduct.sellingPrice < 0) {
          throw new Error(`Geçersiz satış fiyatı (Satır: ${data.products.indexOf(product) + 1})`);
        }

        if (isNaN(formattedProduct.currentStock) || formattedProduct.currentStock < 0) {
          throw new Error(`Geçersiz stok miktarı (Satır: ${data.products.indexOf(product) + 1})`);
        }

        if (isNaN(formattedProduct.minimumStock) || formattedProduct.minimumStock < 0) {
          throw new Error(`Geçersiz minimum stok miktarı (Satır: ${data.products.indexOf(product) + 1})`);
        }

        if (formattedProduct.sellingPrice <= formattedProduct.purchasePrice) {
          throw new Error(`Satış fiyatı alış fiyatından düşük veya eşit olamaz (Satır: ${data.products.indexOf(product) + 1})`);
        }

        // Barkod kontrolü
        if (formattedProduct.barcode) {
          if (!/^[A-Za-z0-9]+$/.test(formattedProduct.barcode)) {
            throw new Error(`Barkod sadece harf ve rakamlardan oluşmalıdır (Satır: ${data.products.indexOf(product) + 1})`);
          }

          // Barkod benzersizlik kontrolü
          const existingProduct = await prisma.product.findFirst({
            where: {
              barcode: formattedProduct.barcode,
              userId: user.id
            }
          });

          if (existingProduct) {
            throw new Error(`Bu barkoda sahip bir ürün zaten mevcut (Satır: ${data.products.indexOf(product) + 1})`);
          }
        }

        // Ürünü oluştur
        const createdProduct = await prisma.product.create({
          data: formattedProduct,
        });

        results.push(createdProduct);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Bilinmeyen hata';
        errors.push(`Satır ${data.products.indexOf(product) + 1}: ${errorMessage}`);
      }
    }

    // Sonuçları döndür
    return NextResponse.json({
      success: results.length > 0,
      message: `${results.length} ürün başarıyla içe aktarıldı${errors.length > 0 ? `, ${errors.length} ürün aktarılamadı` : ''}`,
      products: results,
      errors: errors.length > 0 ? errors : undefined
    });
  } catch (error) {
    // Hata detaylarını güvenli bir şekilde logla
    console.error('Ürün import hatası:', error instanceof Error ? error.message : 'Bilinmeyen hata');

    // Prisma hataları için özel mesajlar
    if (error instanceof Error) {
      if (error.name === 'PrismaClientKnownRequestError') {
        const prismaError = error as Prisma.PrismaClientKnownRequestError;
        if (prismaError.code === 'P2002') {
          return NextResponse.json(
            {
              success: false,
              error: 'Bazı barkodlar sistemde zaten mevcut. Lütfen kontrol edip tekrar deneyin.'
            },
            { status: 400 }
          );
        }
        if (prismaError.code === 'P2028') {
          return NextResponse.json(
            {
              success: false,
              error: 'Veritabanı işlemi zaman aşımına uğradı. Lütfen daha az sayıda ürünle tekrar deneyin.'
            },
            { status: 400 }
          );
        }
      }

      // Validasyon hataları için
      if (error.message.includes('zorunludur') || 
          error.message.includes('negatif olamaz') ||
          error.message.includes('düşük veya eşit olamaz') ||
          error.message.includes('Geçersiz')) {
        return NextResponse.json(
          {
            success: false,
            error: error.message
          },
          { status: 400 }
        );
      }
    }

    // Genel hata durumu
    return NextResponse.json(
      {
        success: false,
        error: 'Ürünler içe aktarılırken bir hata oluştu. Lütfen verilerinizi kontrol edip tekrar deneyin.',
        details: error instanceof Error ? error.message : 'Bilinmeyen hata'
      },
      { status: 500 }
    );
  }
} 