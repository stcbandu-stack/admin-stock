-- ===========================================
-- Schema: ระบบของส่งมอบ (Delivery Items System)
-- ===========================================

-- Table: delivery_boxes (กล่องรายการส่งมอบ)
-- เก็บข้อมูลกล่อง/กลุ่ม ที่ใช้จัดเก็บรายการของส่งมอบ
CREATE TABLE IF NOT EXISTS delivery_boxes (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    header_color VARCHAR(20) DEFAULT '#6b7280', -- สีของ header และ border กล่อง
    position INTEGER DEFAULT 0, -- สำหรับ drag & drop ลำดับกล่อง
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id)
);

-- Migration: เพิ่ม column header_color (ถ้ายังไม่มี)
-- ALTER TABLE delivery_boxes ADD COLUMN IF NOT EXISTS header_color VARCHAR(20) DEFAULT '#6b7280';

-- Table: delivery_items (รายการของส่งมอบในแต่ละกล่อง)
-- เก็บความสัมพันธ์ระหว่างกล่องและของชำร่วย
CREATE TABLE IF NOT EXISTS delivery_items (
    id SERIAL PRIMARY KEY,
    box_id INTEGER NOT NULL REFERENCES delivery_boxes(id) ON DELETE CASCADE,
    item_id INTEGER NOT NULL REFERENCES items(id) ON DELETE CASCADE,
    position INTEGER DEFAULT 0, -- สำหรับ drag & drop ลำดับรายการในกล่อง
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Unique constraint: ของชำร่วย 1 ชิ้น ในกล่องเดียวกันได้แค่ 1 ครั้ง
    UNIQUE(box_id, item_id)
);

-- Indexes for better performance
CREATE INDEX idx_delivery_boxes_position ON delivery_boxes(position);
CREATE INDEX idx_delivery_boxes_active ON delivery_boxes(is_active);
CREATE INDEX idx_delivery_items_box_id ON delivery_items(box_id);
CREATE INDEX idx_delivery_items_position ON delivery_items(position);

-- Trigger: Update updated_at on delivery_boxes
CREATE OR REPLACE FUNCTION update_delivery_box_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_delivery_box_timestamp
    BEFORE UPDATE ON delivery_boxes
    FOR EACH ROW
    EXECUTE FUNCTION update_delivery_box_timestamp();

-- ===========================================
-- Row Level Security (RLS)
-- ===========================================

-- Enable RLS
ALTER TABLE delivery_boxes ENABLE ROW LEVEL SECURITY;
ALTER TABLE delivery_items ENABLE ROW LEVEL SECURITY;

-- Policy: delivery_boxes
-- อ่าน: ทุกคน (รวม anonymous) สามารถอ่านได้
CREATE POLICY "Allow public read delivery_boxes"
    ON delivery_boxes
    FOR SELECT
    USING (true);

-- เพิ่ม/แก้ไข/ลบ: เฉพาะ authenticated users
CREATE POLICY "Allow authenticated insert delivery_boxes"
    ON delivery_boxes
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

CREATE POLICY "Allow authenticated update delivery_boxes"
    ON delivery_boxes
    FOR UPDATE
    TO authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Allow authenticated delete delivery_boxes"
    ON delivery_boxes
    FOR DELETE
    TO authenticated
    USING (true);

-- Policy: delivery_items
-- อ่าน: ทุกคน (รวม anonymous) สามารถอ่านได้
CREATE POLICY "Allow public read delivery_items"
    ON delivery_items
    FOR SELECT
    USING (true);

-- เพิ่ม/แก้ไข/ลบ: เฉพาะ authenticated users
CREATE POLICY "Allow authenticated insert delivery_items"
    ON delivery_items
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

CREATE POLICY "Allow authenticated update delivery_items"
    ON delivery_items
    FOR UPDATE
    TO authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Allow authenticated delete delivery_items"
    ON delivery_items
    FOR DELETE
    TO authenticated
    USING (true);

-- ===========================================
-- Helper Functions
-- ===========================================

-- Function: อัพเดท position ของกล่องทั้งหมด
CREATE OR REPLACE FUNCTION update_box_positions(box_ids INTEGER[], new_positions INTEGER[])
RETURNS void AS $$
DECLARE
    i INTEGER;
BEGIN
    FOR i IN 1..array_length(box_ids, 1) LOOP
        UPDATE delivery_boxes
        SET position = new_positions[i]
        WHERE id = box_ids[i];
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: อัพเดท position ของรายการในกล่อง
CREATE OR REPLACE FUNCTION update_item_positions(item_ids INTEGER[], new_positions INTEGER[])
RETURNS void AS $$
DECLARE
    i INTEGER;
BEGIN
    FOR i IN 1..array_length(item_ids, 1) LOOP
        UPDATE delivery_items
        SET position = new_positions[i]
        WHERE id = item_ids[i];
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
