'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [userName, setUserName] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    setUserName(localStorage.getItem('userName') || '');
    setUserEmail(localStorage.getItem('userEmail') || '');
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
    <>
      {/* Hamburger button — มือถือเท่านั้น */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 w-10 h-10 bg-[#7A3689] text-white rounded-full flex items-center justify-center shadow-lg"
      >
        {isOpen ? '✕' : '☰'}
      </button>

      {/* Overlay — มือถือ */}
      {isOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black bg-opacity-40 z-30"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`
        fixed left-0 top-0 h-full w-64 bg-[#F0E4FF] flex flex-col z-40
        transition-transform duration-300
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        lg:translate-x-0
      `}>
        {/* Logo */}
        <div className="p-6 border-b border-[#E3DAFF]">
          <Link href="/" onClick={() => setIsOpen(false)}>
            <h1 className="text-2xl font-bold text-[#7A3689]">JAMMAN</h1>
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
              <p className="text-sm font-semibold text-[#7A3689] truncate">{userName}</p>
              {userEmail && (
                <p className="text-xs text-[#7A3689] opacity-60 truncate">{userEmail}</p>
              )}
            </div>
          </div>
        </div>

        {/* Menu */}
        <nav className="flex-1 p-4 overflow-y-auto">
          <div className="space-y-2">
            {menuItems.map((item) => (
              <Link
                key={item.path}
                href={item.path}
                onClick={() => setIsOpen(false)}
                className={`flex items-center px-4 py-3 rounded-2xl transition-all duration-200 ${
                  pathname === item.path
                    ? 'bg-[#7A3689] text-white shadow-md'
                    : 'text-[#7A3689] hover:bg-[#E3DAFF]'
                }`}
              >
                <span className="text-xl mr-3">{item.icon}</span>
                <span className="font-medium">{item.name}</span>
              </Link>
            ))}
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
    </>
  );
}