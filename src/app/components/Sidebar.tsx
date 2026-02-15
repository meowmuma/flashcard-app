// src/components/Sidebar.tsx
'use client';

import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';

// Interface สำหรับแต่ละรายการเมนู
// การกำหนดโครงสร้างนี้ทำให้เราเพิ่มเมนูใหม่ได้ง่าย
// และมั่นใจว่าทุกเมนูมีข้อมูลครบถ้วน
interface MenuItem {
  name: string;
  path: string;
  icon: string;
  description: string;
}

export default function Sidebar(): JSX.Element {
  const router = useRouter();
  const pathname = usePathname();
  const [userEmail, setUserEmail] = useState<string>('');
  const [userName, setUserName] = useState<string>('');

  useEffect(() => {
    // ดึงข้อมูลผู้ใช้จาก localStorage
    // เราใช้ || '' เพื่อให้มั่นใจว่าจะได้ string เสมอ ไม่ใช่ null
    const email: string = localStorage.getItem('userEmail') || '';
    setUserEmail(email);
    
    // แยกชื่อผู้ใช้จากอีเมล (ส่วนก่อน @)
    const name: string = email.split('@')[0] || 'User';
    setUserName(name);
  }, []);

  const handleLogout = (): void => {
    // ฟังก์ชันนี้กำหนด return type เป็น void
    // หมายความว่าไม่คืนค่าอะไร เพียงแค่ทำงาน
    localStorage.removeItem('token');
    localStorage.removeItem('userEmail');
    localStorage.removeItem('userId');
    router.push('/login');
  };

  // กำหนดรายการเมนูทั้งหมด
  // TypeScript จะตรวจสอบว่าทุก object มี property ครบตาม MenuItem interface
  const menuItems: MenuItem[] = [
    { 
      name: 'Home', 
      path: '/', 
      icon: '🏠',
      description: 'หน้าแรก'
    },
    { 
      name: 'Flashcards', 
      path: '/create-deck', 
      icon: '📇',
      description: 'สร้างชุดคำศัพท์'
    },
    { 
      name: 'My Library', 
      path: '/my-library', 
      icon: '📚',
      description: 'คลังของฉัน'
    },
    { 
      name: 'My Progress', 
      path: '/my-progress', 
      icon: '📊',
      description: 'ความคืบหน้า'
    },
  ];

  // ฟังก์ชันเช็คว่าเมนูไหน active อยู่
  // parameter และ return type ถูกกำหนดอย่างชัดเจน
  const isActive = (path: string): boolean => {
    if (path === '/') {
      return pathname === '/';
    }
    return pathname.startsWith(path);
  };

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <h1 className="sidebar-logo">JAMMAN</h1>
        
        <div className="sidebar-user">
          <div className="sidebar-user-avatar">
            {userName.charAt(0).toUpperCase()}
          </div>
          <div className="sidebar-user-info">
            <h4>{userName}</h4>
            <p>{userEmail}</p>
          </div>
        </div>
      </div>

      <nav className="sidebar-nav">
        {menuItems.map((item: MenuItem) => (
          <Link
            key={item.path}
            href={item.path}
            className={`sidebar-nav-item ${isActive(item.path) ? 'active' : ''}`}
          >
            <span className="icon">{item.icon}</span>
            <span>{item.name}</span>
          </Link>
        ))}

        <button
          onClick={handleLogout}
          className="sidebar-nav-item"
          style={{ 
            width: '100%', 
            background: 'transparent',
            border: 'none',
            marginTop: '24px',
            color: '#E53E3E'
          }}
        >
          <span className="icon">🚪</span>
          <span>ออกจากระบบ</span>
        </button>
      </nav>
    </aside>
  );
}