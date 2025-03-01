import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserFromRequest } from '@/lib/auth';

interface RequestContext {
  params: {
    id: string;
  };
}

export async function PUT(
  request: Request | NextRequest,
  context: RequestContext
) {
  try {
    const user = await getUserFromRequest(request as NextRequest);
    if (!user) {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 });
    }

    const alert = await prisma.alert.findUnique({
      where: { id: context.params.id },
    });

    if (!alert) {
      return NextResponse.json(
        { error: 'Bildirim bulunamadı' },
        { status: 404 }
      );
    }

    if (alert.userId !== user.id) {
      return NextResponse.json(
        { error: 'Bu bildirimi işaretleme yetkiniz yok' },
        { status: 403 }
      );
    }

    const updatedAlert = await prisma.alert.update({
      where: { id: context.params.id },
      data: { isRead: true },
    });

    return NextResponse.json(updatedAlert);
  } catch (error) {
    console.error('Bildirim okundu işaretlenirken hata:', error);
    return NextResponse.json(
      { error: 'Bildirim okundu işaretlenirken bir hata oluştu' },
      { status: 500 }
    );
  }
} 