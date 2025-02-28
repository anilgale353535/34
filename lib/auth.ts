import { NextRequest } from 'next/server';
import jwt from 'jsonwebtoken';
import { prisma } from './prisma';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

interface JwtPayload {
  userId: string;
}

export async function getUserFromRequest(request: NextRequest) {
  try {
    // Önce Authorization header'ını kontrol et
    let token = request.headers.get('Authorization')?.replace('Bearer ', '');
    
    // Header'da yoksa cookie'den kontrol et
    if (!token) {
      token = request.cookies.get('token')?.value;
    }
    
    if (!token) return null;

    const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;
    if (!decoded.userId) return null;

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
    });

    return user;
  } catch (error) {
    console.error('Auth error:', error);
    return null;
  }
} 