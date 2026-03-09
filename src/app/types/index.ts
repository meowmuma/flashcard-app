// src/types/index.ts

// Interface นี้กำหนดโครงสร้างของข้อมูลผู้ใช้
// เราใช้ interface เพราะมันขยายได้ และอ่านง่าย
export interface User {
  id: number;
  email: string;
  created_at?: string; // เครื่องหมาย ? หมายความว่าอาจจะมีหรือไม่มีก็ได้
}

// Interface สำหรับ Deck (ชุดคำศัพท์)
// เรากำหนดทุกคุณสมบัติที่ชุดคำศัพท์ควรมี
export interface Deck {
  id: number;
  user_id: number;
  title: string;
  created_at: string;
  updated_at: string;
  card_count?: number; // จำนวนการ์ดในชุด อาจจะไม่มีในบาง API response
}

// Interface สำหรับ Card (การ์ดคำศัพท์)
// แต่ละการ์ดจะมีคำศัพท์และความหมาย
export interface Card {
  id?: number; // เวลาสร้างใหม่อาจยังไม่มี id
  deck_id?: number;
  term: string; // คำศัพท์
  definition: string; // คำแปล/ความหมาย
  created_at?: string;
}

// Interface สำหรับข้อมูลความคืบหน้าของแต่ละชุด
// ใช้ในหน้า My Progress เพื่อแสดงสถิติการเรียน
export interface DeckProgress {
  deck_id: number;
  title: string;
  total_cards: number;
  known_cards: number;
  unknown_cards: number;
  last_studied?: string;
}

// Interface สำหรับบันทึกผลการเรียนแต่ละครั้ง
export interface StudySession {
  id: number;
  user_id: number;
  deck_id: number;
  deck_title?: string;
  known_count: number;
  unknown_count: number;
  completed_at: string;
}

// Type สำหรับผลการตอบของแต่ละการ์ด
// เราใช้ type แทน interface เพราะเป็นโครงสร้างง่ายๆ
export type CardResult = {
  cardId: number;
  isKnown: boolean;
};

// Interface สำหรับ API Response ที่ส่งกลับมาจาก login/register
export interface AuthResponse {
  user: User;
  token: string;
}

// Interface สำหรับ API Response ของ decks
export interface DecksResponse {
  decks: Deck[];
}

// Interface สำหรับ API Response ของ deck เดียวพร้อมการ์ด
export interface DeckDetailResponse {
  deck: Deck;
  cards: Card[];
}

// Interface สำหรับ API Response ของข้อมูลความคืบหน้า
export interface ProgressResponse {
  deckProgress: DeckProgress[];
  recentSessions?: StudySession[];
  totalCards?: number;
  knownCards?: number;
  unknownCards?: number;
}

// Type สำหรับ props ของ Component ต่างๆ
export interface DeckCardProps {
  deck: Deck;
  onDelete: (deckId: number) => void | Promise<void>;
  onEdit: (deck: Deck) => void;
}

export interface FlashCardProps {
  card: Card;
  onKnown: (cardId: number) => void;
  onUnknown: (cardId: number) => void;
  showButtons?: boolean;
}

// Type สำหรับ sort options
export type SortOption = 'updated' | 'title' | 'cards';

// Type สำหรับ filter options
export type FilterOption = 'all' | 'completed' | 'in-progress' | 'not-started';