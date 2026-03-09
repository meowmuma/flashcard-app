'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function RegisterPage() {
  const router = useRouter();

  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    // ✅ Validation
    if (!username || username.trim().length < 3) {
      setErrorMessage('ชื่อผู้ใช้ต้องมีอย่างน้อย 3 ตัวอักษร');
      return;
    }

    if (!email || !email.includes('@')) {
      setErrorMessage('กรุณากรอกอีเมลที่ถูกต้อง');
      return;
    }

    if (!password || password.length < 6) {
      setErrorMessage('รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage('รหัสผ่านไม่ตรงกัน');
      return;
    }

    setIsLoading(true);

    try {
      const requestBody = {
        username: username.trim(),
        email: email.trim(),
        password: password,
      };

      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        if (data.token) {
          localStorage.setItem('token', data.token);
        }

        if (data.user) {
          localStorage.setItem('user', JSON.stringify(data.user));
        }

        alert(`สมัครสมาชิกสำเร็จ!\n\nยินดีต้อนรับ ${data.user.name}`);
        router.push('/');
      } else {
        setErrorMessage(data.error || 'เกิดข้อผิดพลาดในการสมัครสมาชิก');
      }
    } catch (error) {
      console.error('Register error:', error);
      setErrorMessage('ไม่สามารถเชื่อมต่อกับ server ได้ กรุณาลองใหม่อีกครั้ง');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-[#7A3689] mb-2">
            สมัครสมาชิก
          </h1>
          <p className="text-[#7A3689] text-opacity-70">
            สร้างบัญชีเพื่อเริ่มใช้งาน Flashcard Learning
          </p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-3xl shadow-xl p-8 space-y-6">
          {errorMessage && (
            <div className="bg-red-50 border-2 border-red-200 rounded-2xl p-4">
              <p className="text-red-600 text-sm font-medium text-center">
                ❌ {errorMessage}
              </p>
            </div>
          )}

          {/* Username */}
          <div>
            <label htmlFor="username" className="block text-sm font-medium text-[#7A3689] mb-2">
              ชื่อผู้ใช้ <span className="text-red-500">*</span>
            </label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="กรอกชื่อผู้ใช้ (อย่างน้อย 3 ตัวอักษร)"
              className="w-full px-4 py-3 bg-[#F0E4FF] border-2 border-transparent rounded-2xl text-[#7A3689] placeholder-[#7A3689] placeholder-opacity-40 focus:border-[#7A3689] focus:outline-none transition-colors"
              required
              minLength={3}
              disabled={isLoading}
            />
          </div>

          {/* Email */}
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-[#7A3689] mb-2">
              อีเมล <span className="text-red-500">*</span>
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="กรอกอีเมล"
              className="w-full px-4 py-3 bg-[#F0E4FF] border-2 border-transparent rounded-2xl text-[#7A3689] placeholder-[#7A3689] placeholder-opacity-40 focus:border-[#7A3689] focus:outline-none transition-colors"
              required
              disabled={isLoading}
            />
          </div>

          {/* Password */}
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-[#7A3689] mb-2">
              รหัสผ่าน <span className="text-red-500">*</span>
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="กรอกรหัสผ่าน (อย่างน้อย 6 ตัวอักษร)"
              className="w-full px-4 py-3 bg-[#F0E4FF] border-2 border-transparent rounded-2xl text-[#7A3689] placeholder-[#7A3689] placeholder-opacity-40 focus:border-[#7A3689] focus:outline-none transition-colors"
              required
              minLength={6}
              disabled={isLoading}
            />
          </div>

          {/* Confirm Password */}
          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-[#7A3689] mb-2">
              ยืนยันรหัสผ่าน <span className="text-red-500">*</span>
            </label>
            <input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="กรอกรหัสผ่านอีกครั้ง"
              className="w-full px-4 py-3 bg-[#F0E4FF] border-2 border-transparent rounded-2xl text-[#7A3689] placeholder-[#7A3689] placeholder-opacity-40 focus:border-[#7A3689] focus:outline-none transition-colors"
              required
              disabled={isLoading}
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-4 bg-gradient-to-r from-[#7A3689] to-[#9D5CB5] text-white rounded-full font-bold text-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? '⏳ กำลังสมัครสมาชิก...' : '✨ สมัครสมาชิก'}
          </button>

          <div className="text-center">
            <p className="text-[#7A3689] text-opacity-70">
              มีบัญชีอยู่แล้ว?{' '}
              <Link
                href="/login"
                className="text-[#7A3689] font-medium hover:underline"
              >
                เข้าสู่ระบบ
              </Link>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}