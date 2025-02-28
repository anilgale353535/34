import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

export interface ProductExcelRow {
  'Ürün Adı': string;
  'Barkod': string;
  'Kategori': string;
  'Alış Fiyatı': number;
  'Satış Fiyatı': number;
  'Mevcut Stok': number;
  'Minimum Stok': number;
  'Birim': string;
  'Açıklama': string;
  'Tedarikçi': string;
}

export function exportProductsToExcel(products: any[]) {
  const worksheet = XLSX.utils.json_to_sheet(
    products.map(product => ({
      'Ürün Adı': product.name,
      'Barkod': product.barcode || '',
      'Kategori': product.category,
      'Alış Fiyatı': product.purchasePrice,
      'Satış Fiyatı': product.sellingPrice,
      'Mevcut Stok': product.currentStock,
      'Minimum Stok': product.minimumStock,
      'Birim': product.unit,
      'Açıklama': product.description || '',
      'Tedarikçi': product.supplier || '',
    }))
  );

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Ürünler');

  // Excel dosyasını oluştur
  const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  const data = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  
  // Dosyayı indir
  saveAs(data, `urunler_${new Date().toISOString().split('T')[0]}.xlsx`);
}

export function getExcelTemplate() {
  const template: ProductExcelRow[] = [{
    'Ürün Adı': 'Örnek Ürün',
    'Barkod': '1234567890',
    'Kategori': 'Örnek Kategori',
    'Alış Fiyatı': 100,
    'Satış Fiyatı': 150,
    'Mevcut Stok': 50,
    'Minimum Stok': 10,
    'Birim': 'ADET',
    'Açıklama': 'Örnek açıklama',
    'Tedarikçi': 'Örnek tedarikçi',
  }];

  const worksheet = XLSX.utils.json_to_sheet(template);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Şablon');

  const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  const data = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  
  saveAs(data, 'urun_import_sablonu.xlsx');
}

export async function parseExcelFile(file: File): Promise<ProductExcelRow[]> {
  try {
    const data = await file.arrayBuffer();
    const workbook = XLSX.read(data);

    // Excel dosyasının boş olup olmadığını kontrol et
    if (!workbook.SheetNames.length) {
      throw new Error('Excel dosyası boş');
    }

    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    
    // Worksheet'in boş olup olmadığını kontrol et
    if (!worksheet || !Object.keys(worksheet).length) {
      throw new Error('Excel sayfası boş');
    }

    const jsonData = XLSX.utils.sheet_to_json(worksheet);

    // Veri olup olmadığını kontrol et
    if (!Array.isArray(jsonData) || jsonData.length === 0) {
      throw new Error('Excel dosyasında veri bulunamadı');
    }

    // Her satır için veri doğrulama
    const validatedData = jsonData.map((row: any, index: number) => {
      const rowNumber = index + 2; // Excel'de başlık satırı 1, ilk veri satırı 2'den başlar

      // Zorunlu alanları kontrol et
      if (!row['Ürün Adı']?.toString().trim()) {
        throw new Error(`Satır ${rowNumber}: Ürün Adı zorunludur`);
      }

      if (!row['Kategori']?.toString().trim()) {
        throw new Error(`Satır ${rowNumber}: Kategori zorunludur`);
      }

      if (!row['Birim']?.toString().trim()) {
        throw new Error(`Satır ${rowNumber}: Birim zorunludur`);
      }

      // Sayısal değerleri kontrol et
      const purchasePrice = Number(row['Alış Fiyatı']);
      if (isNaN(purchasePrice) || purchasePrice < 0) {
        throw new Error(`Satır ${rowNumber}: Alış Fiyatı geçerli bir pozitif sayı olmalıdır`);
      }

      const sellingPrice = Number(row['Satış Fiyatı']);
      if (isNaN(sellingPrice) || sellingPrice < 0) {
        throw new Error(`Satır ${rowNumber}: Satış Fiyatı geçerli bir pozitif sayı olmalıdır`);
      }

      const currentStock = Number(row['Mevcut Stok']);
      if (isNaN(currentStock) || currentStock < 0) {
        throw new Error(`Satır ${rowNumber}: Mevcut Stok geçerli bir pozitif sayı olmalıdır`);
      }

      const minimumStock = Number(row['Minimum Stok']);
      if (isNaN(minimumStock) || minimumStock < 0) {
        throw new Error(`Satır ${rowNumber}: Minimum Stok geçerli bir pozitif sayı olmalıdır`);
      }

      // Barkod kontrolü
      if (row['Barkod'] && !/^[A-Za-z0-9]+$/.test(row['Barkod'])) {
        throw new Error(`Satır ${rowNumber}: Barkod sadece harf ve rakamlardan oluşmalıdır`);
      }

      // Temizlenmiş ve doğrulanmış veriyi döndür
      return {
        'Ürün Adı': row['Ürün Adı'].toString().trim(),
        'Barkod': row['Barkod']?.toString().trim() || '',
        'Kategori': row['Kategori'].toString().trim(),
        'Alış Fiyatı': purchasePrice,
        'Satış Fiyatı': sellingPrice,
        'Mevcut Stok': currentStock,
        'Minimum Stok': minimumStock,
        'Birim': row['Birim'].toString().trim(),
        'Açıklama': row['Açıklama']?.toString().trim() || '',
        'Tedarikçi': row['Tedarikçi']?.toString().trim() || '',
      };
    });

    return validatedData;
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Excel dosyası işlenirken hata: ${error.message}`);
    }
    throw new Error('Excel dosyası işlenirken beklenmeyen bir hata oluştu');
  }
} 