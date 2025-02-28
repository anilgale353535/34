import { NextRequest } from 'next/server';
import { eventBus, EVENT_TYPES } from '@/lib/eventBus';

export async function GET(request: NextRequest) {
  const stream = new TransformStream();
  const writer = stream.writable.getWriter();
  const encoder = new TextEncoder();

  // Event'leri dinle ve stream'e yaz
  const unsubscribes = [
    eventBus.subscribe(EVENT_TYPES.STOCK_MOVEMENT_CREATED, () => {
      writer.write(encoder.encode(`data: ${EVENT_TYPES.STOCK_MOVEMENT_CREATED}\n\n`));
    }),
    eventBus.subscribe(EVENT_TYPES.SALE_CREATED, () => {
      writer.write(encoder.encode(`data: ${EVENT_TYPES.SALE_CREATED}\n\n`));
    }),
    eventBus.subscribe(EVENT_TYPES.PRODUCT_CREATED, () => {
      writer.write(encoder.encode(`data: ${EVENT_TYPES.PRODUCT_CREATED}\n\n`));
    }),
    eventBus.subscribe(EVENT_TYPES.PRODUCT_UPDATED, () => {
      writer.write(encoder.encode(`data: ${EVENT_TYPES.PRODUCT_UPDATED}\n\n`));
    }),
    eventBus.subscribe(EVENT_TYPES.PRODUCT_DELETED, () => {
      writer.write(encoder.encode(`data: ${EVENT_TYPES.PRODUCT_DELETED}\n\n`));
    })
  ];

  // Client bağlantıyı kestiğinde cleanup yap
  request.signal.addEventListener('abort', () => {
    unsubscribes.forEach(unsubscribe => unsubscribe());
    writer.close();
  });

  return new Response(stream.readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
} 