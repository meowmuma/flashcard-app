"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

  const user = {
    username: "pak01",
    email: "pak01@gmail.com",
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    router.push("/login");
  };

  // ฟังก์ชันเช็คว่ากำลังอยู่หน้าไหน จะได้ทำตัวหนาที่ปุ่มนั้น
  const isActive = (path: string) => {
    if (path === '/') return pathname === '/';
    return pathname?.startsWith(path);
  };

  return (
    <aside className="w-[260px] h-screen shrink-0 bg-[#FCFBFF] border-r border-gray-100 flex flex-col justify-between px-5 py-8 sticky top-0">
      <div>
        {/* 🚀 LOGO */}
        <h1 className="text-[32px] font-medium text-[#6B21A8] tracking-wide text-center mb-10 cursor-pointer" onClick={() => router.push('/')}>
          JAMMAN
        </h1>

        {/* 👤 USER CARD */}
        <div className="bg-[#EBE0FC] rounded-[12px] p-3.5 flex items-center gap-4 shadow-[0px_2px_4px_rgba(0,0,0,0.08)] mb-8">
          <div className="w-11 h-11 rounded-full bg-white flex items-center justify-center text-[#4C1D95] shadow-sm shrink-0">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
          <div className="flex flex-col overflow-hidden">
            <h3 className="font-bold text-[#4C1D95] text-[15px] truncate">{user.username}</h3>
            <p className="text-[12px] text-[#6D28D9] truncate">{user.email}</p>
          </div>
        </div>

        {/* 📌 MENU ITEMS */}
        <nav className="space-y-4">
          {/* Home */}
          <Link href="/" className={`flex items-center gap-4 px-4 h-[52px] rounded-[12px] bg-[#EBE0FC] shadow-[0px_2px_4px_rgba(0,0,0,0.08)] transition-all ${isActive('/') ? "ring-2 ring-[#A855F7] text-[#4C1D95] font-bold" : "text-[#5B21B6] font-medium hover:bg-[#E2D4F8]"}`}>
            <svg className="w-6 h-6 shrink-0" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 3L4 9v12h16V9l-8-6zm-1 14H9v-4h2v4zm4 0h-2v-4h2v4z"/>
            </svg>
            <span className="flex-1 text-[15px] mt-[1px]">Home</span>
          </Link>

          {/* Flashcards (ไปหน้าสร้าง) */}
          <Link href="/create-deck" className={`flex items-center gap-4 px-4 h-[52px] rounded-[12px] bg-[#EBE0FC] shadow-[0px_2px_4px_rgba(0,0,0,0.08)] transition-all ${isActive('/create-deck') ? "ring-2 ring-[#A855F7] text-[#4C1D95] font-bold" : "text-[#5B21B6] font-medium hover:bg-[#E2D4F8]"}`}>
            <svg className="w-6 h-6 shrink-0" viewBox="0 0 24 24" fill="currentColor">
              <path d="M4 6h2v14H4zm14-4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h10c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-5 11h-2V7h2v6z"/>
            </svg>
            <span className="flex-1 text-[15px] mt-[1px]">Flashcards</span>
          </Link>

          {/* My Library */}
          <Link href="/my-library" className={`flex items-center gap-4 px-4 h-[52px] rounded-[12px] bg-[#EBE0FC] shadow-[0px_2px_4px_rgba(0,0,0,0.08)] transition-all ${isActive('/my-library') ? "ring-2 ring-[#A855F7] text-[#4C1D95] font-bold" : "text-[#5B21B6] font-medium hover:bg-[#E2D4F8]"}`}>
            <svg className="w-6 h-6 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
            </svg>
            <span className="flex-1 text-[15px] mt-[1px]">My Libary</span>
          </Link>

          {/* My Progress */}
          <Link href="/my-progress" className={`flex items-center gap-4 px-4 h-[52px] rounded-[12px] bg-[#EBE0FC] shadow-[0px_2px_4px_rgba(0,0,0,0.08)] transition-all ${isActive('/my-progress') ? "ring-2 ring-[#A855F7] text-[#4C1D95] font-bold" : "text-[#5B21B6] font-medium hover:bg-[#E2D4F8]"}`}>
            <svg className="w-6 h-6 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 16v-4M12 16v-7M15 16v-2" />
            </svg>
            <span className="flex-1 text-[15px] mt-[1px]">My Progress</span>
          </Link>
        </nav>
      </div>

      {/* 🚪 LOGOUT */}
      <div className="pt-6 mt-4">
        <button onClick={handleLogout} className="w-full flex justify-center items-center gap-2 text-red-500 hover:text-red-600 hover:bg-red-50 py-3 rounded-[12px] font-bold text-[14px] transition-all">
          ออกจากระบบ
        </button>
      </div>
    </aside>
  );
}