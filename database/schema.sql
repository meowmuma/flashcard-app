-- เพิ่มคอลัมน์ใหม่ในตาราง decks สำหรับ Public Library
-- เอาส่วนที่ไม่จำเป็นออก เหลือแค่สิ่งที่จำเป็นจริงๆ
ALTER TABLE decks
ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS description TEXT,
ADD COLUMN IF NOT EXISTS category VARCHAR(100),
ADD COLUMN IF NOT EXISTS times_copied INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS original_deck_id INTEGER REFERENCES decks(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS original_author_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS share_code VARCHAR(20) UNIQUE; -- รหัสสำหรับแชร์ลิงก์

-- สร้าง index เพื่อค้นหาชุดการ์ดจาก share code ได้เร็ว
CREATE INDEX IF NOT EXISTS idx_decks_share_code ON decks(share_code) WHERE share_code IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_decks_is_public ON decks(is_public) WHERE is_public = TRUE;
CREATE INDEX IF NOT EXISTS idx_decks_category ON decks(category) WHERE category IS NOT NULL;

-- สร้างตาราง study_progress สำหรับบันทึกความคืบหน้าการเรียน
-- ตารางนี้จะเก็บว่าผู้ใช้เรียนชุดไหนค้างไว้ตรงไหน
CREATE TABLE IF NOT EXISTS study_progress (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  deck_id INTEGER NOT NULL REFERENCES decks(id) ON DELETE CASCADE,
  current_card_index INTEGER DEFAULT 0, -- บอกว่าเรียนถึงการ์ดใบที่เท่าไหร่แล้ว
  total_cards INTEGER NOT NULL, -- จำนวนการ์ดทั้งหมดในชุดนี้
  known_cards INTEGER DEFAULT 0, -- จำนวนการ์ดที่รู้แล้ว
  unknown_cards INTEGER DEFAULT 0, -- จำนวนการ์ดที่ยังไม่รู้
  session_type VARCHAR(20) DEFAULT 'study', -- 'study' หรือ 'review'
  card_order TEXT, -- เก็บลำดับของการ์ดเป็น JSON array เช่น [1,5,3,2,4]
  last_studied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  is_completed BOOLEAN DEFAULT FALSE, -- จบหมดแล้วหรือยัง
  UNIQUE(user_id, deck_id, session_type, is_completed) -- ห้ามมี session ที่ยังไม่จบซ้ำกัน
);

CREATE INDEX IF NOT EXISTS idx_study_progress_user_deck ON study_progress(user_id, deck_id);
CREATE INDEX IF NOT EXISTS idx_study_progress_incomplete ON study_progress(user_id, is_completed) WHERE is_completed = FALSE;

-- ปรับตาราง game_scores ให้เก็บ best time แทนการเก็บทุกครั้ง
-- เราจะเก็บแค่เวลาที่ดีที่สุดของแต่ละคน ไม่เก็บทุกครั้งที่เล่น
CREATE TABLE IF NOT EXISTS game_best_times (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  deck_id INTEGER NOT NULL REFERENCES decks(id) ON DELETE CASCADE,
  game_type VARCHAR(50) NOT NULL, -- 'matching' หรือเกมประเภทอื่นในอนาคต
  best_time_seconds INTEGER NOT NULL, -- เวลาที่ดีที่สุด (วินาที)
  attempts_count INTEGER DEFAULT 1, -- จำนวนครั้งที่เล่นทั้งหมด
  last_played_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  achieved_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, -- เวลาที่ทำสถิติได้
  UNIQUE(user_id, deck_id, game_type)
);

CREATE INDEX IF NOT EXISTS idx_game_best_times_user ON game_best_times(user_id);
CREATE INDEX IF NOT EXISTS idx_game_best_times_deck ON game_best_times(deck_id);

-- สร้างฟังก์ชันสำหรับสร้าง share code แบบสุ่ม
-- ฟังก์ชันนี้จะสร้างรหัส 8 ตัวอักษร เช่น ABC12XYZ
CREATE OR REPLACE FUNCTION generate_share_code() RETURNS VARCHAR(20) AS $$
DECLARE
  chars VARCHAR(36) := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; -- ไม่มี I, O, 0, 1 เพื่อไม่ให้สับสน
  result VARCHAR(20) := '';
  i INTEGER;
BEGIN
  FOR i IN 1..8 LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::int, 1);
  END LOOP;
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- สร้าง trigger เพื่อสร้าง share code อัตโนมัติเมื่อตั้งค่า is_public = TRUE
CREATE OR REPLACE FUNCTION create_share_code_trigger() RETURNS TRIGGER AS $$
BEGIN
  -- ถ้าตั้งเป็น public และยังไม่มี share code
  IF NEW.is_public = TRUE AND NEW.share_code IS NULL THEN
    -- สร้าง share code ซ้ำจนกว่าจะได้รหัสที่ไม่ซ้ำ
    LOOP
      NEW.share_code := generate_share_code();
      -- ตรวจสอบว่าซ้ำไหม
      IF NOT EXISTS (SELECT 1 FROM decks WHERE share_code = NEW.share_code AND id != NEW.id) THEN
        EXIT;
      END IF;
    END LOOP;
  END IF;
  
  -- ถ้าเปลี่ยนเป็น private ให้ลบ share code ออก
  IF NEW.is_public = FALSE THEN
    NEW.share_code := NULL;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ผูก trigger เข้ากับตาราง decks
DROP TRIGGER IF EXISTS deck_share_code_trigger ON decks;
CREATE TRIGGER deck_share_code_trigger
  BEFORE INSERT OR UPDATE ON decks
  FOR EACH ROW
  EXECUTE FUNCTION create_share_code_trigger();

-- สร้าง view สำหรับดูชุดการ์ดสาธารณะพร้อมข้อมูลสถิติ
CREATE OR REPLACE VIEW public_decks_view AS
SELECT 
  d.id,
  d.title,
  d.description,
  d.category,
  d.share_code,
  d.user_id,
  d.times_copied,
  d.created_at,
  u.email as author_email,
  COUNT(DISTINCT c.id) as card_count
FROM decks d
LEFT JOIN cards c ON d.id = c.deck_id
LEFT JOIN users u ON d.user_id = u.id
WHERE d.is_public = TRUE
GROUP BY d.id, u.email
ORDER BY d.created_at DESC;