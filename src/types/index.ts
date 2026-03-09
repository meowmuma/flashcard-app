// src/types/index.ts

export interface User {
  id: number;
  email: string;
  created_at: string;
}

export interface Deck {
  id: number;
  user_id: number;
  title: string;
  created_at: string;
  updated_at: string;
  
  // ฟิลด์สำหรับ Public Library
  is_public?: boolean;
  description?: string;
  category?: string;
  times_copied?: number;
  share_code?: string; // รหัสสำหรับแชร์
  original_deck_id?: number | null;
  original_author_id?: number | null;
  
  // ฟิลด์เสริมจาก JOIN query
  card_count?: number;
  author_email?: string;
}

export interface Card {
  id: number;
  deck_id: number;
  term: string;
  definition: string;
  created_at: string;
}

export interface CardProgress {
  id: number;
  user_id: number;
  card_id: number;
  is_known: boolean;
  updated_at: string;
}

export interface StudySession {
  id: number;
  user_id: number;
  deck_id: number;
  known_count: number;
  unknown_count: number;
  completed_at: string;
}

// Interface ใหม่สำหรับบันทึกความคืบหน้าการเรียน
export interface StudyProgress {
  id: number;
  user_id: number;
  deck_id: number;
  current_card_index: number; // บอกว่าเรียนถึงการ์ดใบที่เท่าไหร่
  total_cards: number;
  known_cards: number;
  unknown_cards: number;
  session_type: 'study' | 'review';
  card_order: number[]; // ลำดับของการ์ด เช่น [3, 1, 5, 2, 4]
  last_studied_at: string;
  is_completed: boolean;
}

// Interface สำหรับเวลาที่ดีที่สุดในเกม
export interface GameBestTime {
  id: number;
  user_id: number;
  deck_id: number;
  game_type: 'matching' | string;
  best_time_seconds: number; // เวลาที่ดีที่สุดเป็นวินาที
  attempts_count: number; // จำนวนครั้งที่เล่นทั้งหมด
  last_played_at: string;
  achieved_at: string; // เวลาที่ทำสถิติได้
}

// Type สำหรับสร้างหรือแก้ไขชุดการ์ด
export interface DeckFormData {
  title: string;
  description?: string;
  category?: string;
  is_public?: boolean;
  cards: {
    term: string;
    definition: string;
  }[];
}

// Type สำหรับข้อมูลชุดการ์ดสาธารณะ
export interface PublicDeckInfo extends Deck {
  author_email: string;
  card_count: number;
}

// Type สำหรับการ์ดในเกม Matching
export interface MatchingCard {
  id: string;
  content: string;
  type: 'term' | 'definition';
  pairId: number;
  x: number;
  y: number;
  matched: boolean;
  selected: boolean; // เพิ่มสถานะว่าถูกเลือกอยู่หรือไม่
}

// Type สำหรับสถานะของเกม Matching
export interface MatchingGameState {
  cards: MatchingCard[];
  selectedCards: string[];
  matchedPairs: number;
  totalPairs: number;
  startTime: number | null;
  endTime: number | null;
  isGameCompleted: boolean;
  currentBestTime: number | null; // เวลาที่ดีที่สุดของผู้เล่นในชุดนี้
}