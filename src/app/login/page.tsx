'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function LoginPage(): JSX.Element {
  const router = useRouter();
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'เกิดข้อผิดพลาด');
      }

      localStorage.setItem('token', data.token);
      localStorage.setItem('userEmail', data.user.email);
      localStorage.setItem('userId', data.user.id.toString());

      router.push('/');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    // พื้นหลังหลัก
    <div className="min-h-screen flex w-full font-sans">
      
      {/* 👈 ส่วนแถบสีขาวด้านซ้าย (ความกว้าง 260px เท่ากับ Sidebar หน้าอื่น) */}
      <aside className="w-[260px] bg-white border-r border-gray-100 flex flex-col shrink-0 h-screen hidden md:flex">
        {/* ให้โลโก้อยู่ตำแหน่งเดียวกับหน้าอื่นเป๊ะๆ */}
        <div className="py-8 px-5">
          <h1 className="text-[32px] font-medium text-[#6B21A8] tracking-wide text-center mb-10">
            JAMMAN
          </h1>
        </div>
      </aside>

      {/* 👉 ส่วนเนื้อหาหลักตรงกลาง (พื้นหลังสีม่วงอ่อน) */}
      <main className="flex-1 flex flex-col items-center justify-center p-4 bg-[#EBE0FC]">
        
        {/* หัวข้อ Login */}
        <div className="text-center mb-8">
          <h1 className="text-6xl font-normal mb-3 text-gray-800 tracking-tight">
            Login
          </h1>
          <p className="text-[20px] text-gray-500 font-medium">
            Welcome back to jamman
          </p>
        </div>

        {/* Card สีขาวของฟอร์ม */}
        <div className="bg-white rounded-[40px] shadow-sm w-full max-w-[550px] p-12">
          
          {error && (
            <div className="bg-red-50 text-red-500 p-4 rounded-[15px] mb-6 text-center text-[15px] border border-red-100 font-medium">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Input อีเมล */}
            <div>
              <label className="block text-[16px] mb-2 text-gray-700 font-bold">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="Gmail"
                className="w-full px-5 py-4 border-none bg-[#FAFAFD] shadow-[inset_0px_1px_3px_rgba(0,0,0,0.05)] rounded-[15px] focus:outline-none focus:ring-2 focus:ring-purple-200 transition-all text-[15px] placeholder-gray-400"
              />
            </div>

            {/* Input รหัสผ่าน */}
            <div>
              <label className="block text-[16px] mb-2 text-gray-700 font-bold">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="Password"
                className="w-full px-5 py-4 border-none bg-[#FAFAFD] shadow-[inset_0px_1px_3px_rgba(0,0,0,0.05)] rounded-[15px] focus:outline-none focus:ring-2 focus:ring-purple-200 transition-all text-[15px] placeholder-gray-400"
              />
            </div>

            {/* ปุ่ม Login สีดำเข้ม */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-4 rounded-[15px] text-white text-[18px] font-bold shadow-md transition-all hover:bg-[#1A1A1A] disabled:opacity-50 mt-4 bg-[#2D3136]"
            >
              {isLoading ? 'กำลังเข้าสู่ระบบ...' : 'Login'}
            </button>

            {/* ลิงก์ด้านล่างสุดของฟอร์ม */}
            <div className="flex justify-between items-center pt-2">
              <Link href="/forgot-password" className="text-gray-500 hover:text-gray-800 underline text-[15px] font-medium transition-colors">
                Forgot password?
              </Link>
              <div className="text-gray-500 text-[15px] font-medium">
                ยังไม่มีบัญชี <Link href="/register" className="text-gray-800 underline ml-1 hover:text-black transition-colors font-bold">sign up</Link>
              </div>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}