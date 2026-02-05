// Type definitions for Stock components

export interface StockItem {
  id: number;
  name: string;
  description?: string;
  quantity: number;
  total_quantity: number;
  image_url?: string;
  cost_per_unit?: number;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface LogEntry {
  id: number;
  item_id: number;
  item_name: string;
  action_type: 'WITHDRAW' | 'RESTOCK' | 'ADD_NEW' | 'DELETE';
  amount: number;
  balance_after: number;
  report_date: string;
  user_name?: string;
  branch?: string;
  activity_name?: string;
  activity_location?: string;
  activity_date?: string;
  note?: string;
  cost_per_unit?: number;
  created_at?: string;
  items?: {
    name: string;
  };
}

export interface ActionForm {
  itemId: number | null;
  itemName: string;
  type: 'RESTOCK' | 'WITHDRAW' | '';
  amount: string;
  date: string;
  userName: string;
  branch: string;
  actName: string;
  actLoc: string;
  actDate: string;
  note: string;
}

export interface AddItemForm {
  name: string;
  desc: string;
  qty: string;
  cost: string;
  file: File | null;
}

export interface EditItemForm {
  id: number | null;
  name: string;
  desc: string;
  cost: string;
  file: File | null;
}

// ===========================================
// Delivery System Types (ของส่งมอบ)
// ===========================================

export interface DeliveryBox {
  id: number;
  name: string;
  description?: string;
  header_color?: string; // สีของ header และ border กล่อง
  position: number;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
  created_by?: string;
  items?: DeliveryItemWithDetails[];
}

export interface DeliveryItem {
  id: number;
  box_id: number;
  item_id: number;
  position: number;
  created_at?: string;
}

export interface DeliveryItemWithDetails extends DeliveryItem {
  items: {
    id: number;
    name: string;
    image_url?: string;
    quantity: number;
    description?: string;
  };
}

export interface CreateBoxForm {
  name: string;
  description: string;
}

export interface AddDeliveryItemsForm {
  boxId: number;
  itemIds: number[];
}
