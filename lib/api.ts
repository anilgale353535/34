import { cacheService } from './cache';

interface FetchApiOptions {
  method?: string;
  data?: Record<string, unknown>;
  useCache?: boolean;
  cacheTTL?: number;
}

export async function fetchApi<T>(endpoint: string, options: FetchApiOptions = {}): Promise<T> {
  const {
    method = 'GET',
    data,
    useCache = true,
    cacheTTL = 5 * 60 * 1000 // 5 dakika
  } = options;

  const cacheKey = `api:${endpoint}`;

  // GET istekleri için cache kontrolü
  if (method === 'GET' && useCache) {
    const cachedData = cacheService.get(cacheKey);
    if (cachedData) {
      return cachedData as T;
    }
  }

  // Token'ı cookie'den al
  const cookies = document.cookie.split(';');
  const tokenCookie = cookies.find(cookie => cookie.trim().startsWith('token='));
  const token = tokenCookie ? tokenCookie.split('=')[1] : null;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`/api${endpoint}`, {
    method,
    headers,
    body: data ? JSON.stringify(data) : undefined,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || 'Bir hata oluştu');
  }

  if (response.status === 204) {
    return null as T;
  }

  const responseData = await response.json();

  // GET istekleri için cache'e kaydet
  if (method === 'GET' && useCache) {
    cacheService.set(cacheKey, responseData, cacheTTL);
  }

  return responseData as T;
}

// Cache'i temizlemek için yardımcı fonksiyon
export function invalidateApiCache(endpoint: string): void {
  const cacheKey = `api:${endpoint}`;
  cacheService.invalidate(cacheKey);
} 