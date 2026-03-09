// src/components/ProtectedRoute.tsx
'use client';

import { useEffect, useState, ReactNode } from 'react';
import { useRouter } from 'next/navigation';

// Interface สำหรับ props ของ component นี้
// ReactNode คือ type พิเศษที่รองรับ children ทุกประเภท
// ไม่ว่าจะเป็น element, string, number, หรือ fragment
interface ProtectedRouteProps {
  children: ReactNode;
}

export default function ProtectedRoute({ children }: ProtectedRouteProps): JSX.Element | null {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    // ตรวจสอบว่ามี token หรือไม่
    const token: string | null = localStorage.getItem('token');
    
    if (!token) {
      // ไม่มี token แสดงว่ายังไม่ได้ login
      router.push('/login');
      return;
    }

    // มี token แสดงว่า login แล้ว
    // ในระบบจริงควรส่ง token ไป verify กับ backend ด้วย
    setIsAuthenticated(true);
    setIsLoading(false);
  }, [router]);

  // กำลังตรวจสอบ แสดง loading
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="loading-spinner"></div>
      </div>
    );
  }

  // ถ้ายังไม่ได้ authenticate ไม่แสดงอะไร
  // เพราะกำลังจะ redirect ไปหน้า login
  if (!isAuthenticated) {
    return null;
  }

  // authenticated แล้ว แสดง children
  return <>{children}</>;
}