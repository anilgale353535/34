import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';

export type AuditAction = 'CREATE' | 'UPDATE' | 'DELETE';

export interface AuditLogParams {
  action: AuditAction;
  entityType: string;
  entityId: string;
  userId: string;
  details?: Record<string, unknown>;
}

export async function createAuditLog({
  action,
  entityType,
  entityId,
  userId,
  details
}: AuditLogParams) {
  try {
    await prisma.auditLog.create({
      data: {
        action,
        entityType,
        entityId,
        userId,
        details: details ? (details as Prisma.JsonObject) : null
      }
    });
  } catch (error) {
    console.error('Audit log oluşturulurken hata:', error);
  }
} 