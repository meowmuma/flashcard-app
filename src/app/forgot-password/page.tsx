'use client';

import { useState, FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function ForgotPasswordPage(): JSX.Element {
  const router = useRouter();
  const [email, setEmail] = useState<string>('');
  const [newPassword, setNewPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (newPassword !== confirmPassword) {
      setError('รหัสผ่านไม่ตรงกัน');
      return;
    }

    if (newPassword.length < 6) {
      setError('รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร');
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, newPassword }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'เกิดข้อผิดพลาด');
      }

      setSuccess('รีเซ็ตรหัสผ่านสำเร็จ! กำลังกลับสู่หน้า Login...');
      setEmail('');
      setNewPassword('');
      setConfirmPassword('');
      
      setTimeout(() => router.push('/login'), 2000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    // พื้นหลังหลัก
    <div className="min-h-screen flex w-full font-sans">
      
      {/* 👈 ส่วนแถบสีขาวด้านซ้าย (ความกว้าง 260px เท่ากับหน้า Login) */}
      <aside className="w-[260px] bg-white border-r border-gray-100 flex flex-col shrink-0 h-screen hidden md:flex">
        <div className="py-8 px-5">
          <h1 className="text-[32px] font-medium text-[#6B21A8] tracking-wide text-center mb-10">
            JAMMAN
          </h1>
        </div>
      </aside>

      {/* 👉 ส่วนเนื้อหาหลักตรงกลาง (พื้นหลังสีม่วงอ่อนแบบเดียวกับหน้า Login) */}
      <main className="flex-1 flex flex-col items-center justify-center p-4 bg-[#EBE0FC]">
        
        {/* หัวข้อ Reset password */}
        <div className="text-center mb-8">
          <h1 className="text-6xl font-normal mb-3 text-gray-800 tracking-tight">
            Reset password?
          </h1>
          <p className="text-[20px] text-gray-500 font-medium">
            Please enter your details to reset your password
          </p>
        </div>

        {/* Card สีขาวของฟอร์ม */}
        <div className="bg-white rounded-[40px] shadow-sm w-full max-w-[550px] p-12">
          
          {/* ส่วนแสดง Error / Success */}
          {error && (
            <div className="bg-red-50 text-red-500 p-4 rounded-[15px] mb-6 text-center text-[15px] border border-red-100 font-medium">
              {error}
            </div>
          )}
          {success && (
            <div className="bg-green-50 text-green-600 p-4 rounded-[15px] mb-6 text-center text-[15px] border border-green-100 font-medium">
              {success}
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

            {/* Input รหัสผ่านใหม่ */}
            <div>
              <label className="block text-[16px] mb-2 text-gray-700 font-bold">New Password</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                placeholder="Password"
                className="w-full px-5 py-4 border-none bg-[#FAFAFD] shadow-[inset_0px_1px_3px_rgba(0,0,0,0.05)] rounded-[15px] focus:outline-none focus:ring-2 focus:ring-purple-200 transition-all text-[15px] placeholder-gray-400"
              />
            </div>

            {/* Input ยืนยันรหัสผ่านใหม่ */}
            <div>
              <label className="block text-[16px] mb-2 text-gray-700 font-bold">Confirm Password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                placeholder="Password"
                className="w-full px-5 py-4 border-none bg-[#FAFAFD] shadow-[inset_0px_1px_3px_rgba(0,0,0,0.05)] rounded-[15px] focus:outline-none focus:ring-2 focus:ring-purple-200 transition-all text-[15px] placeholder-gray-400"
              />
            </div>

            {/* ปุ่มกด Action */}
            <div className="flex gap-4 pt-4">
              <Link 
                href="/login"
                className="flex-1 py-4 text-center rounded-[15px] text-gray-600 border border-gray-200 font-bold hover:bg-gray-50 transition-all text-[16px]"
              >
                Cancel
              </Link>
              <button
                type="submit"
                disabled={isLoading}
                className="flex-1 py-4 rounded-[15px] text-white font-bold shadow-md transition-all hover:bg-[#1A1A1A] disabled:opacity-50 text-[16px] bg-[#2D3136]"
              >
                {isLoading ? 'Processing...' : 'Reset Password'}
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}