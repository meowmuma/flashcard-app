// src/lib/supabase.ts
import { createClient } from '@supabase/supabase-js';

// ดึงค่า environment variables
// เราใส่ || '' เพื่อให้แน่ใจว่าถ้าค่าไม่มีจะได้ string ว่างแทนที่จะเป็น undefined
const supabaseUrl: string = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey: string = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// ตรวจสอบว่ามีค่าครบถ้วนหรือไม่
// ถ้าขาดค่าใดค่าหนึ่ง แสดงว่าเรายังไม่ได้ตั้งค่า environment variables
if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase environment variables. Please check your .env.local file.'
  );
}

// สร้าง Supabase client
// client นี้จะเป็นตัวที่เราใช้ติดต่อกับ Supabase ในทุกๆ ที่
// เราสร้างแค่ครั้งเดียวแล้ว export ออกไปให้ส่วนอื่นๆ ใช้งาน
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Export เพื่อให้ใช้งานได้ทั่วทั้งแอป
export default supabase;