<template>
  <div>
    <!-- Admin Controls -->
    <div v-if="currentUser" class="mb-6 flex justify-between items-center">
      <h2 class="text-xl font-bold border-l-4 border-red-600 pl-3">ของส่งมอบ</h2>
      
      <!-- Create Box Button -->
      <button 
        @click="modals.createBox = true" 
        class="bg-black text-white px-4 py-2 rounded hover:bg-gray-800 shadow-lg flex items-center gap-2"
      >
        <i class="fa-solid fa-plus"></i> สร้างรายการ
      </button>
    </div>

    <!-- Guest Message -->
    <div v-if="!currentUser" class="mb-6">
      <h2 class="text-xl font-bold border-l-4 border-red-600 pl-3">ของส่งมอบ</h2>
      <p class="text-gray-500 mt-2 text-sm">กรุณาเข้าสู่ระบบเพื่อจัดการรายการ</p>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="text-center py-20 text-gray-400 font-bold animate-pulse">
      กำลังโหลดข้อมูล...
    </div>

    <!-- Empty State -->
    <div v-else-if="boxes.length === 0" class="text-center py-20">
      <i class="fa-solid fa-box-open text-6xl text-gray-300 mb-4"></i>
      <p class="text-gray-500">ยังไม่มีรายการของส่งมอบ</p>
      <button 
        v-if="currentUser"
        @click="modals.createBox = true" 
        class="mt-4 bg-black text-white px-4 py-2 rounded hover:bg-gray-800"
      >
        <i class="fa-solid fa-plus"></i> สร้างรายการแรก
      </button>
    </div>

    <!-- Boxes List (Drag & Drop) -->
    <div v-else class="space-y-6">
      <TransitionGroup name="box-list" tag="div" class="space-y-6">
        <div 
          v-for="(box, boxIndex) in boxes" 
          :key="box.id"
          :draggable="currentUser ? true : false"
          @dragstart="onBoxDragStart($event, boxIndex)"
          @dragover.prevent="onBoxDragOver($event, boxIndex)"
          @drop="onBoxDrop($event, boxIndex)"
          @dragend="onBoxDragEnd"
          :class="[
            'bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden transition-all duration-200',
            draggingBoxIndex === boxIndex ? 'opacity-50 scale-[0.98]' : '',
            boxDragOverIndex === boxIndex && draggingBoxIndex !== boxIndex ? 'border-red-400 border-2' : '',
            currentUser ? 'cursor-grab' : ''
          ]"
        >
          <!-- Box Header -->
          <div class="bg-gray-50 p-4 flex justify-between items-start border-b border-gray-100">
            <div class="flex items-start gap-3">
              <i v-if="currentUser" class="fa-solid fa-grip-vertical text-gray-400 mt-1 cursor-grab"></i>
              <div>
                <h3 class="font-bold text-lg">{{ box.name }}</h3>
                <p v-if="box.description" class="text-gray-500 text-sm mt-1">{{ box.description }}</p>
              </div>
            </div>
            
            <div v-if="currentUser" class="flex items-center gap-2">
              <button 
                @click.stop="openAddItemsModal(box)"
                class="bg-green-500 text-white px-3 py-1.5 rounded text-sm hover:bg-green-600 flex items-center gap-1"
              >
                <i class="fa-solid fa-plus"></i> เพิ่มของ
              </button>
              <button 
                @click.stop="openEditBoxModal(box)"
                class="text-gray-500 hover:text-amber-500 p-2"
              >
                <i class="fa-solid fa-pen"></i>
              </button>
              <button 
                @click.stop="confirmDeleteBox(box)"
                class="text-gray-500 hover:text-red-500 p-2"
              >
                <i class="fa-solid fa-trash"></i>
              </button>
            </div>
          </div>
          
          <!-- Box Items -->
          <div class="p-4">
            <div v-if="!box.items || box.items.length === 0" class="text-center py-8 text-gray-400">
              <i class="fa-solid fa-inbox text-3xl mb-2"></i>
              <p class="text-sm">ยังไม่มีรายการ</p>
            </div>
            
            <TransitionGroup v-else name="item-list" tag="div" class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              <div
                v-for="(item, itemIndex) in box.items"
                :key="item.id"
                :draggable="currentUser ? true : false"
                @dragstart.stop="onItemDragStart($event, boxIndex, itemIndex)"
                @dragover.prevent.stop="onItemDragOver($event, boxIndex, itemIndex)"
                @drop.stop="onItemDrop($event, boxIndex, itemIndex)"
                @dragend="onItemDragEnd"
                :class="[
                  'relative bg-gray-50 rounded-lg p-3 border border-gray-200 transition-all duration-200',
                  draggingItem?.boxIndex === boxIndex && draggingItem?.itemIndex === itemIndex ? 'opacity-50 scale-95' : '',
                  itemDragOver?.boxIndex === boxIndex && itemDragOver?.itemIndex === itemIndex ? 'border-red-400 border-2' : '',
                  currentUser ? 'cursor-grab hover:shadow-md' : ''
                ]"
              >
                <!-- Delete Item Button -->
                <button 
                  v-if="currentUser"
                  @click.stop="removeItemFromBox(box.id, item.id)"
                  class="absolute -top-2 -right-2 bg-red-500 text-white w-6 h-6 rounded-full text-xs hover:bg-red-600 shadow-lg z-10"
                >
                  <i class="fa-solid fa-times"></i>
                </button>
                
                <!-- Item Image -->
                <div class="aspect-square bg-gray-200 rounded-lg overflow-hidden mb-2">
                  <img 
                    v-if="item.items?.image_url" 
                    :src="item.items.image_url" 
                    :alt="item.items?.name"
                    class="w-full h-full object-cover"
                  >
                  <div v-else class="w-full h-full flex items-center justify-center text-gray-400">
                    <i class="fa-solid fa-image text-2xl"></i>
                  </div>
                </div>
                
                <!-- Item Info -->
                <h4 class="font-medium text-sm truncate" :title="item.items?.name">{{ item.items?.name }}</h4>
                <p class="text-xs text-gray-500">
                  คงเหลือ: 
                  <span :class="item.items?.quantity > 0 ? 'text-green-600 font-bold' : 'text-red-600 font-bold'">
                    {{ item.items?.quantity }}
                  </span> ชิ้น
                </p>
              </div>
            </TransitionGroup>
          </div>
        </div>
      </TransitionGroup>
    </div>

    <!-- Create Box Modal -->
    <Modal v-model="modals.createBox" title="สร้างรายการใหม่">
      <div class="space-y-3">
        <input 
          type="text" 
          v-model="createBoxForm.name" 
          placeholder="ชื่อรายการ (เช่น มกราคม 2567)" 
          class="w-full border p-2 rounded focus:border-red-600 outline-none"
        >
        <textarea 
          v-model="createBoxForm.description" 
          placeholder="คำอธิบาย (ไม่บังคับ)" 
          rows="3"
          class="w-full border p-2 rounded focus:border-red-600 outline-none resize-none"
        ></textarea>
      </div>
      
      <template #footer>
        <div class="flex justify-end gap-2">
          <button @click="closeCreateBoxModal" class="text-gray-500 px-4 py-2">ยกเลิก</button>
          <button 
            @click="createBox" 
            :disabled="isProcessing || !createBoxForm.name.trim()" 
            :class="{'opacity-50 cursor-not-allowed': isProcessing || !createBoxForm.name.trim()}" 
            class="bg-black text-white px-4 py-2 rounded flex items-center gap-2"
          >
            <i v-if="isProcessing" class="fa-solid fa-spinner fa-spin"></i>
            <span>สร้าง</span>
          </button>
        </div>
      </template>
    </Modal>

    <!-- Edit Box Modal -->
    <Modal v-model="modals.editBox" title="แก้ไขรายการ">
      <div class="space-y-3">
        <input 
          type="text" 
          v-model="editBoxForm.name" 
          placeholder="ชื่อรายการ" 
          class="w-full border p-2 rounded focus:border-red-600 outline-none"
        >
        <textarea 
          v-model="editBoxForm.description" 
          placeholder="คำอธิบาย (ไม่บังคับ)" 
          rows="3"
          class="w-full border p-2 rounded focus:border-red-600 outline-none resize-none"
        ></textarea>
      </div>
      
      <template #footer>
        <div class="flex justify-end gap-2">
          <button @click="modals.editBox = false" class="text-gray-500 px-4 py-2">ยกเลิก</button>
          <button 
            @click="updateBox" 
            :disabled="isProcessing || !editBoxForm.name.trim()" 
            :class="{'opacity-50 cursor-not-allowed': isProcessing || !editBoxForm.name.trim()}" 
            class="bg-black text-white px-4 py-2 rounded flex items-center gap-2"
          >
            <i v-if="isProcessing" class="fa-solid fa-spinner fa-spin"></i>
            <span>บันทึก</span>
          </button>
        </div>
      </template>
    </Modal>

    <!-- Add Items Modal -->
    <Modal v-model="modals.addItems" title="เพิ่มของส่งมอบ" size="lg">
      <div class="space-y-4">
        <!-- Search -->
        <div class="relative">
          <input 
            type="text" 
            v-model="itemSearch" 
            placeholder="ค้นหาของชำร่วย..." 
            class="w-full border p-2 pl-10 rounded focus:border-red-600 outline-none"
          >
          <i class="fa-solid fa-magnifying-glass absolute left-3 top-3 text-gray-400"></i>
        </div>

        <!-- Selected Items Preview -->
        <div v-if="selectedItems.length > 0" class="bg-green-50 p-3 rounded-lg border border-green-200">
          <p class="text-sm text-green-700 font-medium mb-2">
            <i class="fa-solid fa-check-circle"></i> 
            เลือกแล้ว {{ selectedItems.length }} รายการ
          </p>
          <div class="flex flex-wrap gap-2">
            <span 
              v-for="itemId in selectedItems" 
              :key="itemId"
              class="bg-white px-2 py-1 rounded text-xs flex items-center gap-1 border border-green-300"
            >
              {{ getItemName(itemId) }}
              <button @click="toggleItemSelection(itemId)" class="text-red-500 hover:text-red-700">
                <i class="fa-solid fa-times"></i>
              </button>
            </span>
          </div>
        </div>

        <!-- Items List -->
        <div class="max-h-80 overflow-y-auto border rounded-lg">
          <div v-if="loadingItems" class="text-center py-8 text-gray-400">
            <i class="fa-solid fa-spinner fa-spin text-2xl"></i>
          </div>
          <div v-else-if="filteredStockItems.length === 0" class="text-center py-8 text-gray-400">
            <p>ไม่พบรายการที่มีสต็อค</p>
          </div>
          <div v-else class="divide-y">
            <label 
              v-for="item in filteredStockItems" 
              :key="item.id"
              :class="[
                'flex items-center gap-3 p-3 cursor-pointer hover:bg-gray-50 transition',
                selectedItems.includes(item.id) ? 'bg-green-50' : ''
              ]"
            >
              <input 
                type="checkbox" 
                :checked="selectedItems.includes(item.id)"
                @change="toggleItemSelection(item.id)"
                class="w-4 h-4 text-red-600 rounded focus:ring-red-500"
              >
              <div class="w-12 h-12 bg-gray-200 rounded overflow-hidden flex-shrink-0">
                <img 
                  v-if="item.image_url" 
                  :src="item.image_url" 
                  :alt="item.name"
                  class="w-full h-full object-cover"
                >
                <div v-else class="w-full h-full flex items-center justify-center text-gray-400">
                  <i class="fa-solid fa-image"></i>
                </div>
              </div>
              <div class="flex-1 min-w-0">
                <h4 class="font-medium truncate">{{ item.name }}</h4>
                <p class="text-sm text-gray-500">
                  คงเหลือ: 
                  <span class="text-green-600 font-bold">{{ item.quantity }}</span> ชิ้น
                </p>
              </div>
            </label>
          </div>
        </div>
      </div>
      
      <template #footer>
        <div class="flex justify-end gap-2">
          <button @click="closeAddItemsModal" class="text-gray-500 px-4 py-2">ยกเลิก</button>
          <button 
            @click="addItemsToBox" 
            :disabled="isProcessing || selectedItems.length === 0" 
            :class="{'opacity-50 cursor-not-allowed': isProcessing || selectedItems.length === 0}" 
            class="bg-green-600 text-white px-4 py-2 rounded flex items-center gap-2"
          >
            <i v-if="isProcessing" class="fa-solid fa-spinner fa-spin"></i>
            <span>เพิ่ม {{ selectedItems.length }} รายการ</span>
          </button>
        </div>
      </template>
    </Modal>

    <!-- Delete Confirmation Modal -->
    <Modal v-model="modals.deleteBox" title="ยืนยันการลบ" variant="danger">
      <p class="text-gray-600">
        คุณต้องการลบ "<strong>{{ boxToDelete?.name }}</strong>" และรายการทั้งหมดภายในใช่หรือไม่?
      </p>
      <p class="text-red-500 text-sm mt-2">
        <i class="fa-solid fa-exclamation-triangle"></i> การกระทำนี้ไม่สามารถย้อนกลับได้
      </p>
      
      <template #footer>
        <div class="flex justify-end gap-2">
          <button @click="modals.deleteBox = false" class="text-gray-500 px-4 py-2">ยกเลิก</button>
          <button 
            @click="deleteBox" 
            :disabled="isProcessing" 
            :class="{'opacity-50 cursor-not-allowed': isProcessing}" 
            class="bg-red-600 text-white px-4 py-2 rounded flex items-center gap-2"
          >
            <i v-if="isProcessing" class="fa-solid fa-spinner fa-spin"></i>
            <span>ลบ</span>
          </button>
        </div>
      </template>
    </Modal>

    <!-- Reorder Result Modal -->
    <Modal v-model="modals.reorderResult" :title="reorderSuccess ? 'สำเร็จ' : 'เกิดข้อผิดพลาด'" :variant="reorderSuccess ? 'default' : 'danger'">
      <p class="text-gray-600">
        <i v-if="reorderSuccess" class="fa-solid fa-check-circle text-green-500"></i>
        <i v-else class="fa-solid fa-times-circle text-red-500"></i>
        {{ reorderMessage }}
      </p>
      
      <template #footer>
        <div class="flex justify-end">
          <button @click="modals.reorderResult = false" class="bg-black text-white px-4 py-2 rounded">
            ตกลง
          </button>
        </div>
      </template>
    </Modal>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, onUnmounted } from 'vue';
import { supabase, type User } from '@/lib/supabase';
import Modal from '@/components/common/Modal.vue';
import type { DeliveryBox, DeliveryItemWithDetails, StockItem } from '@/components/stock/types';

// State
const currentUser = ref<User | null>(null);
const loading = ref(true);
const isProcessing = ref(false);
const boxes = ref<DeliveryBox[]>([]);
const stockItems = ref<StockItem[]>([]);
const loadingItems = ref(false);
const itemSearch = ref('');
const selectedItems = ref<number[]>([]);
const selectedBoxId = ref<number | null>(null);

// Modals
const modals = reactive({
  createBox: false,
  editBox: false,
  addItems: false,
  deleteBox: false,
  reorderResult: false
});

// Forms
const createBoxForm = reactive({
  name: '',
  description: ''
});

const editBoxForm = reactive({
  id: null as number | null,
  name: '',
  description: ''
});

const boxToDelete = ref<DeliveryBox | null>(null);

// Reorder result
const reorderSuccess = ref(false);
const reorderMessage = ref('');

// Drag & Drop State for Boxes
const draggingBoxIndex = ref<number | null>(null);
const boxDragOverIndex = ref<number | null>(null);

// Drag & Drop State for Items
const draggingItem = ref<{ boxIndex: number; itemIndex: number } | null>(null);
const itemDragOver = ref<{ boxIndex: number; itemIndex: number } | null>(null);

// Computed
const filteredStockItems = computed(() => {
  if (!stockItems.value.length) return [];
  
  let filtered = stockItems.value.filter(item => item.quantity > 0 && item.is_active);
  
  // Exclude items already in the selected box
  if (selectedBoxId.value) {
    const box = boxes.value.find(b => b.id === selectedBoxId.value);
    if (box?.items) {
      const existingIds = box.items.map(i => i.item_id);
      filtered = filtered.filter(item => !existingIds.includes(item.id));
    }
  }
  
  if (itemSearch.value.trim()) {
    const search = itemSearch.value.toLowerCase();
    filtered = filtered.filter(item => 
      item.name.toLowerCase().includes(search) ||
      item.description?.toLowerCase().includes(search)
    );
  }
  
  return filtered;
});

// Methods
async function fetchBoxes() {
  loading.value = true;
  try {
    const { data, error } = await supabase
      .from('delivery_boxes')
      .select(`
        *,
        items:delivery_items(
          id,
          box_id,
          item_id,
          position,
          items(id, name, image_url, quantity, description)
        )
      `)
      .eq('is_active', true)
      .order('position', { ascending: true });

    if (error) throw error;
    
    // Transform and sort items within each box by position
    boxes.value = (data || []).map((box: any) => ({
      ...box,
      items: (box.items || [])
        .map((item: any) => ({
          ...item,
          items: Array.isArray(item.items) ? item.items[0] : item.items
        }))
        .sort((a: DeliveryItemWithDetails, b: DeliveryItemWithDetails) => a.position - b.position)
    }));
  } catch (error) {
    console.error('Error fetching boxes:', error);
    showToast('ไม่สามารถโหลดข้อมูลได้', 'error');
  } finally {
    loading.value = false;
  }
}

async function fetchStockItems() {
  loadingItems.value = true;
  try {
    const { data, error } = await supabase
      .from('items')
      .select('*')
      .eq('is_active', true)
      .gt('quantity', 0)
      .order('name');

    if (error) throw error;
    stockItems.value = data || [];
  } catch (error) {
    console.error('Error fetching stock items:', error);
  } finally {
    loadingItems.value = false;
  }
}

// Box CRUD
async function createBox() {
  if (!createBoxForm.name.trim()) return;
  
  isProcessing.value = true;
  try {
    const maxPosition = boxes.value.length > 0 
      ? Math.max(...boxes.value.map(b => b.position)) + 1 
      : 0;

    const { data, error } = await supabase
      .from('delivery_boxes')
      .insert({
        name: createBoxForm.name.trim(),
        description: createBoxForm.description.trim() || null,
        position: maxPosition,
        created_by: currentUser.value?.id
      })
      .select()
      .single();

    if (error) throw error;
    
    boxes.value.push({ ...data, items: [] });
    closeCreateBoxModal();
    showToast('สร้างรายการสำเร็จ', 'success');
  } catch (error) {
    console.error('Error creating box:', error);
    showToast('ไม่สามารถสร้างรายการได้', 'error');
  } finally {
    isProcessing.value = false;
  }
}

function openEditBoxModal(box: DeliveryBox) {
  editBoxForm.id = box.id;
  editBoxForm.name = box.name;
  editBoxForm.description = box.description || '';
  modals.editBox = true;
}

async function updateBox() {
  if (!editBoxForm.id || !editBoxForm.name.trim()) return;
  
  isProcessing.value = true;
  try {
    const { error } = await supabase
      .from('delivery_boxes')
      .update({
        name: editBoxForm.name.trim(),
        description: editBoxForm.description.trim() || null
      })
      .eq('id', editBoxForm.id);

    if (error) throw error;
    
    const index = boxes.value.findIndex(b => b.id === editBoxForm.id);
    if (index !== -1) {
      boxes.value[index].name = editBoxForm.name.trim();
      boxes.value[index].description = editBoxForm.description.trim() || undefined;
    }
    
    modals.editBox = false;
    showToast('อัพเดทรายการสำเร็จ', 'success');
  } catch (error) {
    console.error('Error updating box:', error);
    showToast('ไม่สามารถอัพเดทรายการได้', 'error');
  } finally {
    isProcessing.value = false;
  }
}

function confirmDeleteBox(box: DeliveryBox) {
  boxToDelete.value = box;
  modals.deleteBox = true;
}

async function deleteBox() {
  if (!boxToDelete.value) return;
  
  isProcessing.value = true;
  try {
    const { error } = await supabase
      .from('delivery_boxes')
      .delete()
      .eq('id', boxToDelete.value.id);

    if (error) throw error;
    
    boxes.value = boxes.value.filter(b => b.id !== boxToDelete.value?.id);
    modals.deleteBox = false;
    boxToDelete.value = null;
    showToast('ลบรายการสำเร็จ', 'success');
  } catch (error) {
    console.error('Error deleting box:', error);
    showToast('ไม่สามารถลบรายการได้', 'error');
  } finally {
    isProcessing.value = false;
  }
}

// Items CRUD
function openAddItemsModal(box: DeliveryBox) {
  selectedBoxId.value = box.id;
  selectedItems.value = [];
  itemSearch.value = '';
  fetchStockItems();
  modals.addItems = true;
}

function closeAddItemsModal() {
  modals.addItems = false;
  selectedItems.value = [];
  selectedBoxId.value = null;
  itemSearch.value = '';
}

function toggleItemSelection(itemId: number) {
  const index = selectedItems.value.indexOf(itemId);
  if (index === -1) {
    selectedItems.value.push(itemId);
  } else {
    selectedItems.value.splice(index, 1);
  }
}

function getItemName(itemId: number): string {
  const item = stockItems.value.find(i => i.id === itemId);
  return item?.name || 'Unknown';
}

async function addItemsToBox() {
  if (!selectedBoxId.value || selectedItems.value.length === 0) return;
  
  isProcessing.value = true;
  try {
    const box = boxes.value.find(b => b.id === selectedBoxId.value);
    const maxPosition = box?.items?.length 
      ? Math.max(...box.items.map(i => i.position)) + 1 
      : 0;

    const insertData = selectedItems.value.map((itemId, index) => ({
      box_id: selectedBoxId.value,
      item_id: itemId,
      position: maxPosition + index
    }));

    const { data, error } = await supabase
      .from('delivery_items')
      .insert(insertData)
      .select(`
        id,
        box_id,
        item_id,
        position,
        items(id, name, image_url, quantity, description)
      `);

    if (error) throw error;
    
    // Transform data - Supabase returns items as array, we need single object
    const transformedData = (data || []).map((item: any) => ({
      ...item,
      items: Array.isArray(item.items) ? item.items[0] : item.items
    })) as DeliveryItemWithDetails[];
    
    // Update local state
    const boxIndex = boxes.value.findIndex(b => b.id === selectedBoxId.value);
    if (boxIndex !== -1) {
      if (!boxes.value[boxIndex].items) {
        boxes.value[boxIndex].items = [];
      }
      boxes.value[boxIndex].items!.push(...transformedData);
    }
    
    closeAddItemsModal();
    showToast(`เพิ่ม ${transformedData.length} รายการสำเร็จ`, 'success');
  } catch (error) {
    console.error('Error adding items:', error);
    showToast('ไม่สามารถเพิ่มรายการได้', 'error');
  } finally {
    isProcessing.value = false;
  }
}

async function removeItemFromBox(boxId: number, deliveryItemId: number) {
  try {
    const { error } = await supabase
      .from('delivery_items')
      .delete()
      .eq('id', deliveryItemId);

    if (error) throw error;
    
    const boxIndex = boxes.value.findIndex(b => b.id === boxId);
    if (boxIndex !== -1 && boxes.value[boxIndex].items) {
      boxes.value[boxIndex].items = boxes.value[boxIndex].items!.filter(i => i.id !== deliveryItemId);
    }
    
    showToast('ลบรายการสำเร็จ', 'success');
  } catch (error) {
    console.error('Error removing item:', error);
    showToast('ไม่สามารถลบรายการได้', 'error');
  }
}

// ==========================================
// Drag & Drop for Boxes (Optimistic UI)
// ==========================================
function onBoxDragStart(event: DragEvent, index: number) {
  draggingBoxIndex.value = index;
  event.dataTransfer?.setData('type', 'box');
  event.dataTransfer?.setData('index', index.toString());
}

function onBoxDragOver(event: DragEvent, index: number) {
  const type = event.dataTransfer?.getData('type');
  if (type === 'box' || draggingBoxIndex.value !== null) {
    boxDragOverIndex.value = index;
  }
}

async function onBoxDrop(event: DragEvent, targetIndex: number) {
  const type = event.dataTransfer?.getData('type');
  if (type !== 'box' && draggingBoxIndex.value === null) return;
  
  const sourceIndex = draggingBoxIndex.value ?? parseInt(event.dataTransfer?.getData('index') || '-1');
  if (sourceIndex === -1 || sourceIndex === targetIndex) {
    resetBoxDragState();
    return;
  }
  
  // Optimistic UI: Swap immediately
  const oldBoxes = [...boxes.value];
  const [movedBox] = boxes.value.splice(sourceIndex, 1);
  boxes.value.splice(targetIndex, 0, movedBox);
  
  // Update positions
  boxes.value.forEach((box, i) => {
    box.position = i;
  });
  
  resetBoxDragState();
  
  // Sync to database
  try {
    const updates = boxes.value.map((box, index) => ({
      id: box.id,
      position: index
    }));
    
    // Update each box position
    for (const u of updates) {
      const { error } = await supabase
        .from('delivery_boxes')
        .update({ position: u.position })
        .eq('id', u.id);
      
      if (error) throw error;
    }
    
    reorderSuccess.value = true;
    reorderMessage.value = 'สลับตำแหน่งกล่องสำเร็จ';
  } catch (error) {
    console.error('Error reordering boxes:', error);
    // Rollback
    boxes.value = oldBoxes;
    reorderSuccess.value = false;
    reorderMessage.value = 'ไม่สามารถสลับตำแหน่งได้ กรุณาลองใหม่';
  }
  
  modals.reorderResult = true;
}

function onBoxDragEnd() {
  resetBoxDragState();
}

function resetBoxDragState() {
  draggingBoxIndex.value = null;
  boxDragOverIndex.value = null;
}

// ==========================================
// Drag & Drop for Items (Optimistic UI)
// ==========================================
function onItemDragStart(event: DragEvent, boxIndex: number, itemIndex: number) {
  draggingItem.value = { boxIndex, itemIndex };
  event.dataTransfer?.setData('type', 'item');
  event.dataTransfer?.setData('boxIndex', boxIndex.toString());
  event.dataTransfer?.setData('itemIndex', itemIndex.toString());
}

function onItemDragOver(event: DragEvent, boxIndex: number, itemIndex: number) {
  if (draggingItem.value) {
    // Only allow drag within same box
    if (draggingItem.value.boxIndex === boxIndex) {
      itemDragOver.value = { boxIndex, itemIndex };
    }
  }
}

async function onItemDrop(event: DragEvent, targetBoxIndex: number, targetItemIndex: number) {
  if (!draggingItem.value) return;
  
  const sourceBoxIndex = draggingItem.value.boxIndex;
  const sourceItemIndex = draggingItem.value.itemIndex;
  
  // Only handle same box reordering for now
  if (sourceBoxIndex !== targetBoxIndex || sourceItemIndex === targetItemIndex) {
    resetItemDragState();
    return;
  }
  
  const box = boxes.value[sourceBoxIndex];
  if (!box.items) {
    resetItemDragState();
    return;
  }
  
  // Optimistic UI: Swap immediately
  const oldItems = [...box.items];
  const [movedItem] = box.items.splice(sourceItemIndex, 1);
  box.items.splice(targetItemIndex, 0, movedItem);
  
  // Update positions
  box.items.forEach((item, i) => {
    item.position = i;
  });
  
  resetItemDragState();
  
  // Sync to database
  try {
    for (const item of box.items) {
      const { error } = await supabase
        .from('delivery_items')
        .update({ position: item.position })
        .eq('id', item.id);
      
      if (error) throw error;
    }
    
    reorderSuccess.value = true;
    reorderMessage.value = 'สลับตำแหน่งรายการสำเร็จ';
  } catch (error) {
    console.error('Error reordering items:', error);
    // Rollback
    box.items = oldItems;
    reorderSuccess.value = false;
    reorderMessage.value = 'ไม่สามารถสลับตำแหน่งได้ กรุณาลองใหม่';
  }
  
  modals.reorderResult = true;
}

function onItemDragEnd() {
  resetItemDragState();
}

function resetItemDragState() {
  draggingItem.value = null;
  itemDragOver.value = null;
}

// Helpers
function closeCreateBoxModal() {
  modals.createBox = false;
  createBoxForm.name = '';
  createBoxForm.description = '';
}

function showToast(message: string, type: 'success' | 'error' | 'info' = 'info') {
  window.dispatchEvent(new CustomEvent('show-toast', {
    detail: { message, type }
  }));
}

// Auth handling
async function checkUser() {
  const { data: { session } } = await supabase.auth.getSession();
  currentUser.value = session?.user || null;
}

function handleAuthChange(event: CustomEvent) {
  currentUser.value = event.detail?.user || null;
}

// Lifecycle
onMounted(async () => {
  await checkUser();
  await fetchBoxes();
  
  window.addEventListener('auth-change', handleAuthChange as EventListener);
});

onUnmounted(() => {
  window.removeEventListener('auth-change', handleAuthChange as EventListener);
});
</script>

<style scoped>
/* Box List Transition */
.box-list-enter-active,
.box-list-leave-active {
  transition: all 0.3s ease;
}

.box-list-enter-from,
.box-list-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}

.box-list-move {
  transition: transform 0.3s ease;
}

/* Item List Transition */
.item-list-enter-active,
.item-list-leave-active {
  transition: all 0.2s ease;
}

.item-list-enter-from,
.item-list-leave-to {
  opacity: 0;
  transform: scale(0.9);
}

.item-list-move {
  transition: transform 0.2s ease;
}
</style>
