import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserFromRequest } from '@/lib/auth';
import { exec } from 'child_process';
import { promisify } from 'util';
import { writeFile } from 'fs/promises';
import path from 'path';

const execAsync = promisify(exec);

export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json(
        { error: 'Yetkilendirme hatası' },
        { status: 401 }
      );
    }

    // API key kontrolü
    const apiKey = request.headers.get('x-api-key');
    if (!process.env.BACKUP_API_KEY || apiKey !== process.env.BACKUP_API_KEY) {
      return NextResponse.json(
        { error: 'Geçersiz API anahtarı' },
        { status: 401 }
      );
    }

    // Geçici dosya adı oluştur
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `backup-${timestamp}.sql`;
    const filepath = path.join('/tmp', filename);

    // pg_dump komutunu oluştur
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
      throw new Error('DATABASE_URL bulunamadı');
    }

    // pg_dump ile yedek al
    const { stdout, stderr } = await execAsync(`pg_dump ${databaseUrl} > ${filepath}`);
    
    if (stderr) {
      console.error('Yedekleme hatası:', stderr);
    }

    // Dosyayı oku ve response olarak gönder
    const headers = new Headers();
    headers.set('Content-Type', 'application/sql');
    headers.set('Content-Disposition', `attachment; filename="${filename}"`);

    // Stream olarak dosyayı gönder
    const response = new NextResponse(
      new ReadableStream({
        async start(controller) {
          const buffer = await import('fs/promises').then(fs => fs.readFile(filepath));
          controller.enqueue(buffer);
          controller.close();
          // Geçici dosyayı sil
          await import('fs/promises').then(fs => fs.unlink(filepath));
        }
      }),
      {
        status: 200,
        headers
      }
    );

    return response;
  } catch (error) {
    console.error('Yedekleme hatası:', error);
    return NextResponse.json(
      { error: 'Yedekleme sırasında bir hata oluştu' },
      { status: 500 }
    );
  }
} 