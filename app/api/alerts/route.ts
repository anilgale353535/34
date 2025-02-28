import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserFromRequest } from '@/lib/auth';

// Bildirimleri getir
export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 });
    }

    const alerts = await prisma.alert.findMany({
      where: {
        userId: user.id,
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 50, // Son 50 bildirimi getir
    });

    return NextResponse.json(alerts);
  } catch (error) {
    console.error('Bildirimler getirilirken hata:', error);
    return NextResponse.json(
      { error: 'Bildirimler getirilirken bir hata oluştu' },
      { status: 500 }
    );
  }
}

// Yeni bildirim oluştur
export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 });
    }

    const { message } = await request.json();
    if (!message) {
      return NextResponse.json(
        { error: 'Bildirim mesajı gereklidir' },
        { status: 400 }
      );
    }

    const alert = await prisma.alert.create({
      data: {
        message,
        userId: user.id,
      },
    });

    return NextResponse.json(alert);
  } catch (error) {
    console.error('Bildirim oluşturulurken hata:', error);
    return NextResponse.json(
      { error: 'Bildirim oluşturulurken bir hata oluştu' },
      { status: 500 }
    );
  }
} 