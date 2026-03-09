// src/components/Sidebar.tsx
'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [userName, setUserName] = useState('');
  const [userEmail, setUserEmail] = useState('');

  useEffect(() => {
    const storedName = localStorage.getItem('userName');
    const storedEmail = localStorage.getItem('userEmail');

    if (storedName) {
      setUserName(storedName);
    }

    if (storedEmail) {
      setUserEmail(storedEmail);
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('userName');
    localStorage.removeItem('userEmail');
    router.push('/login');
  };

  const menuItems = [
    { name: 'Home', path: '/', icon: '🏠' },
    { name: 'Flashcards', path: '/flashcards', icon: '📇' },
    { name: 'My Library', path: '/my-library', icon: '📚' },
    { name: 'My Progress', path: '/my-progress', icon: '📊' },
  ];

  return (
    <div className="w-64 bg-[#F0E4FF] fixed left-0 top-0 h-full flex flex-col">
      {/* Logo */}
      <div className="p-6 border-b border-[#E3DAFF]">
        <Link href="/" className="block">
          <h1 className="text-2xl font-bold text-[#7A3689]">
            JAMMAN
          </h1>
        </Link>
      </div>

      {/* User Info */}
      <div className="p-6 border-b border-[#E3DAFF]">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-[#E3DAFF] rounded-full flex items-center justify-center">
            <span className="text-[#7A3689] font-semibold">
              {userName.charAt(0).toUpperCase()}
            </span>
          </div>

          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-[#7A3689] truncate">
              {userName}
            </p>

            {userEmail && (
              <p className="text-xs text-[#7A3689] opacity-60 truncate">
                {userEmail}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Menu */}
      <nav className="flex-1 p-4 overflow-y-auto">
        <div className="space-y-2">
          {menuItems.map((item) => {
            const isActive = pathname === item.path;

            return (
              <Link
                key={item.path}
                href={item.path}
                className={`
                  flex items-center px-4 py-3 rounded-2xl transition-all duration-200
                  ${
                    isActive
                      ? 'bg-[#7A3689] text-white shadow-md'
                      : 'text-[#7A3689] hover:bg-[#E3DAFF]'
                  }
                `}
              >
                <span className="text-xl mr-3">{item.icon}</span>
                <span className="font-medium">{item.name}</span>
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Logout */}
      <div className="p-4 border-t border-[#E3DAFF]">
        <button
          onClick={handleLogout}
          className="w-full px-4 py-3 bg-white text-[#7A3689] rounded-2xl hover:bg-[#E3DAFF] transition-all font-medium flex items-center justify-center border border-[#E3DAFF]"
        >
          <span className="mr-2">🚪</span>
          Logout
        </button>
      </div>
    </div>
  );
}