"use client";

import { usePathname } from 'next/navigation';
import MainLayout from './MainLayout';

interface RootLayoutClientProps {
  children: React.ReactNode;
}

export default function RootLayoutClient({ children }: RootLayoutClientProps) {
  const pathname = usePathname();
  const isLoginPage = pathname === '/login';

  return isLoginPage ? children : <MainLayout>{children}</MainLayout>;
} 