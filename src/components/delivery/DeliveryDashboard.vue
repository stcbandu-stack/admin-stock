<template>
  <div>
    <!-- Admin Controls -->
    <div v-if="currentUser" class="mb-6 flex justify-between items-center">
      <h2 class="text-xl font-bold border-l-4 border-red-600 pl-3 dark:text-white">ของส่งมอบ</h2>
      
      <div class="flex items-center gap-2">
        <!-- Edit Mode Toggle Button -->
        <button 
          @click="isEditMode = !isEditMode" 
          :class="[
            'px-4 py-2 rounded shadow-lg flex items-center gap-2 transition-colors',
            isEditMode 
              ? 'bg-amber-500 text-white hover:bg-amber-600 dark:bg-amber-600 dark:hover:bg-amber-700' 
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600'
          ]"
        >
          <i :class="isEditMode ? 'fa-solid fa-lock-open' : 'fa-solid fa-lock'"></i>
          {{ isEditMode ? 'กำลังแก้ไข' : 'แก้ไขหน้า' }}
        </button>
        
        <!-- Create Box Button -->
        <button 
          v-if="isEditMode"
          @click="modals.createBox = true" 
          class="bg-black text-white px-4 py-2 rounded hover:bg-gray-800 shadow-lg flex items-center gap-2 dark:bg-red-600 dark:hover:bg-red-700"
        >
          <i class="fa-solid fa-plus"></i> สร้างรายการ
        </button>
      </div>
    </div>

    <!-- Guest Message -->
    <div v-if="!currentUser" class="mb-6">
      <h2 class="text-xl font-bold border-l-4 border-red-600 pl-3 dark:text-white">ของส่งมอบ</h2>
      <p class="text-gray-500 mt-2 text-sm dark:text-gray-400">กรุณาเข้าสู่ระบบเพื่อจัดการรายการ</p>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="text-center py-20 text-gray-400 font-bold animate-pulse dark:text-gray-500">
      กำลังโหลดข้อมูล...
    </div>

    <!-- Empty State -->
    <div v-else-if="boxes.length === 0" class="text-center py-20">
      <i class="fa-solid fa-box-open text-6xl text-gray-300 mb-4 dark:text-gray-600"></i>
      <p class="text-gray-500 dark:text-gray-400">ยังไม่มีรายการของส่งมอบ</p>
      <button 
        v-if="currentUser"
        @click="modals.createBox = true" 
        class="mt-4 bg-black text-white px-4 py-2 rounded hover:bg-gray-800 dark:bg-red-600 dark:hover:bg-red-700"
      >
        <i class="fa-solid fa-plus"></i> สร้างรายการแรก
      </button>
    </div>

    <!-- Boxes List (Drag & Drop) -->
    <div v-else>
      <TransitionGroup name="box-list" tag="div" class="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div 
          v-for="(box, boxIndex) in boxes" 
          :key="box.id"
          :draggable="currentUser && isEditMode ? true : false"
          @dragstart="onBoxDragStart($event, boxIndex)"
          @dragover.prevent="onBoxDragOver($event, boxIndex)"
          @drop="onBoxDrop($event, boxIndex)"
          @dragend="onBoxDragEnd"
          :class="[
            'bg-white rounded-xl shadow-sm overflow-hidden transition-all duration-200 dark:bg-gray-800',
            draggingBoxIndex === boxIndex ? 'opacity-50 scale-[0.98]' : '',
            boxDragOverIndex === boxIndex && draggingBoxIndex !== boxIndex ? 'ring-2 ring-offset-2' : '',
            currentUser && isEditMode ? 'cursor-grab' : ''
          ]"
          :style="{
            border: `2px solid ${box.header_color || '#e5e7eb'}`
          }"
        >
          <!-- Box Header -->
          <div 
            class="p-3 flex justify-between items-start"
            :style="{
              backgroundColor: box.header_color || '#f9fafb',
              borderBottom: `2px solid ${box.header_color || '#f3f4f6'}`
            }"
          >
            <div class="flex items-start gap-2">
              <i v-if="currentUser && isEditMode" class="fa-solid fa-grip-vertical mt-0.5 cursor-grab" :style="{ color: getContrastColor(box.header_color || '#f9fafb') }"></i>
              <div>
                <h3 class="font-bold text-base" :style="{ color: getContrastColor(box.header_color || '#f9fafb') }">{{ box.name }}</h3>
                <p v-if="box.description" class="text-xs mt-0.5" :style="{ color: getContrastColor(box.header_color || '#f9fafb'), opacity: 0.8 }">{{ box.description }}</p>
              </div>
            </div>
            
            <div v-if="currentUser && isEditMode" class="flex items-center gap-1">
              <button 
                @click.stop="openAddItemsModal(box)"
                class="bg-green-500 text-white px-2 py-1 rounded text-xs hover:bg-green-600 flex items-center gap-1 dark:bg-green-600 dark:hover:bg-green-700"
              >
                <i class="fa-solid fa-plus"></i> เพิ่ม
              </button>
              <button 
                @click.stop="openEditBoxModal(box)"
                class="hover:bg-white/20 p-1.5 rounded" 
                :style="{ color: getContrastColor(box.header_color || '#f9fafb') }"
              >
                <i class="fa-solid fa-pen text-sm"></i>
              </button>
              <button 
                @click.stop="confirmDeleteBox(box)"
                class="hover:bg-white/20 p-1.5 rounded"
                :style="{ color: getContrastColor(box.header_color || '#f9fafb') }"
              >
                <i class="fa-solid fa-trash text-sm"></i>
              </button>
            </div>
          </div>
          
          <!-- Box Items -->
          <div class="p-3">
            <div v-if="!box.items || box.items.length === 0" class="text-center py-6 text-gray-400">
              <i class="fa-solid fa-inbox text-2xl mb-2"></i>
              <p class="text-xs">ยังไม่มีรายการ</p>
            </div>
            
            <TransitionGroup v-else name="item-list" tag="div" class="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
              <div
                v-for="(item, itemIndex) in box.items"
                :key="item.id"
                :draggable="currentUser && isEditMode ? true : false"
                @dragstart.stop="onItemDragStart($event, boxIndex, itemIndex)"
                @dragover.prevent.stop="onItemDragOver($event, boxIndex, itemIndex)"
                @drop.stop="onItemDrop($event, boxIndex, itemIndex)"
                @dragend="onItemDragEnd"
                :class="[
                  'relative bg-gray-50 rounded-lg p-2 border border-gray-200 transition-all duration-200 dark:bg-gray-700 dark:border-gray-600',
                  draggingItem?.boxIndex === boxIndex && draggingItem?.itemIndex === itemIndex ? 'opacity-50 scale-95' : '',
                  itemDragOver?.boxIndex === boxIndex && itemDragOver?.itemIndex === itemIndex ? 'border-red-400 border-2' : '',
                  currentUser && isEditMode ? 'cursor-grab hover:shadow-md' : ''
                ]"
              >
                <!-- Delete Item Button -->
                <button 
                  v-if="currentUser && isEditMode"
                  @click.stop="removeItemFromBox(box.id, item.id)"
                  class="absolute -top-1.5 -right-1.5 bg-red-500 text-white w-5 h-5 rounded-full text-xs hover:bg-red-600 shadow-lg z-10 flex items-center justify-center"
                >
                  <i class="fa-solid fa-times text-[10px]"></i>
                </button>
                
                <!-- Item Image (smaller) -->
                <div class="aspect-square bg-gray-200 rounded overflow-hidden mb-1.5 dark:bg-gray-600">
                  <img 
                    v-if="item.items?.image_url" 
                    :src="item.items.image_url" 
                    :alt="item.items?.name"
                    class="w-full h-full object-cover"
                  >
                  <div v-else class="w-full h-full flex items-center justify-center text-gray-400">
                    <i class="fa-solid fa-image text-lg"></i>
                  </div>
                </div>
                
                <!-- Item Info (compact) -->
                <h4 class="font-medium text-xs truncate dark:text-white" :title="item.items?.name">{{ item.items?.name }}</h4>
                
                <!-- Quantity Badge + Withdraw Button -->
                <div class="mt-1.5 flex items-center gap-1">
                  <span 
                    :class="[
                      'inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-bold flex-1',
                      item.items?.quantity > 0 
                        ? 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-400' 
                        : 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-400'
                    ]"
                  >
                    {{ item.items?.quantity }}
                  </span>
                  <!-- Withdraw Button -->
                  <button 
                    v-if="currentUser && item.items?.quantity > 0"
                    @click.stop="openWithdrawModal(item.items)"
                    class="bg-amber-500 text-white px-1.5 py-0.5 rounded text-xs hover:bg-amber-600 flex items-center gap-0.5 dark:bg-amber-600 dark:hover:bg-amber-700"
                    title="เบิก"
                  >
                    <i class="fa-solid fa-arrow-right-from-bracket text-[10px]"></i>
                  </button>
                </div>
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
          class="w-full border p-2 rounded focus:border-red-600 outline-none dark:bg-gray-700 dark:border-gray-600 dark:text-white"
        >
        <textarea 
          v-model="createBoxForm.description" 
          placeholder="คำอธิบาย (ไม่บังคับ)" 
          rows="3"
          class="w-full border p-2 rounded focus:border-red-600 outline-none resize-none dark:bg-gray-700 dark:border-gray-600 dark:text-white"
        ></textarea>
        
        <!-- Color Picker -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2 dark:text-gray-300">
            <i class="fa-solid fa-palette mr-1"></i> สีกล่อง
          </label>
          <div class="flex flex-wrap gap-2">
            <button
              v-for="color in colorOptions"
              :key="color.value"
              type="button"
              @click="createBoxForm.headerColor = color.value"
              :class="[
                'w-8 h-8 rounded-lg border-2 transition-all',
                createBoxForm.headerColor === color.value ? 'ring-2 ring-offset-2 ring-gray-400 scale-110 dark:ring-gray-300' : 'hover:scale-105'
              ]"
              :style="{ backgroundColor: color.value, borderColor: color.value }"
              :title="color.name"
            ></button>
          </div>
          <div class="mt-2 flex items-center gap-2">
            <span class="text-sm text-gray-500 dark:text-gray-400">สีที่เลือก:</span>
            <div 
              class="w-6 h-6 rounded border"
              :style="{ backgroundColor: createBoxForm.headerColor }"
            ></div>
            <span class="text-xs text-gray-400">{{ createBoxForm.headerColor }}</span>
          </div>
        </div>
      </div>
      
      <template #footer>
        <div class="flex justify-end gap-2">
          <button @click="closeCreateBoxModal" class="text-gray-500 px-4 py-2 dark:text-gray-400">ยกเลิก</button>
          <button 
            @click="createBox" 
            :disabled="isProcessing || !createBoxForm.name.trim()" 
            :class="{'opacity-50 cursor-not-allowed': isProcessing || !createBoxForm.name.trim()}" 
            class="bg-black text-white px-4 py-2 rounded flex items-center gap-2 dark:bg-red-600 dark:hover:bg-red-700"
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
          class="w-full border p-2 rounded focus:border-red-600 outline-none dark:bg-gray-700 dark:border-gray-600 dark:text-white"
        >
        <textarea 
          v-model="editBoxForm.description" 
          placeholder="คำอธิบาย (ไม่บังคับ)" 
          rows="3"
          class="w-full border p-2 rounded focus:border-red-600 outline-none resize-none dark:bg-gray-700 dark:border-gray-600 dark:text-white"
        ></textarea>
        
        <!-- Color Picker -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2 dark:text-gray-300">
            <i class="fa-solid fa-palette mr-1"></i> สีกล่อง
          </label>
          <div class="flex flex-wrap gap-2">
            <button
              v-for="color in colorOptions"
              :key="color.value"
              type="button"
              @click="editBoxForm.headerColor = color.value"
              :class="[
                'w-8 h-8 rounded-lg border-2 transition-all',
                editBoxForm.headerColor === color.value ? 'ring-2 ring-offset-2 ring-gray-400 scale-110 dark:ring-gray-300' : 'hover:scale-105'
              ]"
              :style="{ backgroundColor: color.value, borderColor: color.value }"
              :title="color.name"
            ></button>
          </div>
          <div class="mt-2 flex items-center gap-2">
            <span class="text-sm text-gray-500 dark:text-gray-400">สีที่เลือก:</span>
            <div 
              class="w-6 h-6 rounded border"
              :style="{ backgroundColor: editBoxForm.headerColor }"
            ></div>
            <span class="text-xs text-gray-400">{{ editBoxForm.headerColor }}</span>
          </div>
        </div>
      </div>
      
      <template #footer>
        <div class="flex justify-end gap-2">
          <button @click="modals.editBox = false" class="text-gray-500 px-4 py-2 dark:text-gray-400">ยกเลิก</button>
          <button 
            @click="updateBox" 
            :disabled="isProcessing || !editBoxForm.name.trim()" 
            :class="{'opacity-50 cursor-not-allowed': isProcessing || !editBoxForm.name.trim()}" 
            class="bg-black text-white px-4 py-2 rounded flex items-center gap-2 dark:bg-red-600 dark:hover:bg-red-700"
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
            class="w-full border p-2 pl-10 rounded focus:border-red-600 outline-none dark:bg-gray-700 dark:border-gray-600 dark:text-white"
          >
          <i class="fa-solid fa-magnifying-glass absolute left-3 top-3 text-gray-400"></i>
        </div>

        <!-- Selected Items Preview -->
        <div v-if="selectedItems.length > 0" class="bg-green-50 p-3 rounded-lg border border-green-200 dark:bg-green-900/20 dark:border-green-800">
          <p class="text-sm text-green-700 font-medium mb-2 dark:text-green-400">
            <i class="fa-solid fa-check-circle"></i> 
            เลือกแล้ว {{ selectedItems.length }} รายการ
          </p>
          <div class="flex flex-wrap gap-2">
            <span 
              v-for="itemId in selectedItems" 
              :key="itemId"
              class="bg-white px-2 py-1 rounded text-xs flex items-center gap-1 border border-green-300 dark:bg-gray-800 dark:border-gray-600 dark:text-white"
            >
              {{ getItemName(itemId) }}
              <button @click="toggleItemSelection(itemId)" class="text-red-500 hover:text-red-700 dark:hover:text-red-600">
                <i class="fa-solid fa-times"></i>
              </button>
            </span>
          </div>
        </div>

        <!-- Items List -->
        <div class="max-h-80 overflow-y-auto border rounded-lg dark:border-gray-700">
          <div v-if="loadingItems" class="text-center py-8 text-gray-400 dark:text-gray-500">
            <i class="fa-solid fa-spinner fa-spin text-2xl"></i>
          </div>
          <div v-else-if="filteredStockItems.length === 0" class="text-center py-8 text-gray-400 dark:text-gray-500">
            <p>ไม่พบรายการที่มีสต็อค</p>
          </div>
          <div v-else class="divide-y dark:divide-gray-700">
            <label 
              v-for="item in filteredStockItems" 
              :key="item.id"
              :class="[
                'flex items-center gap-3 p-3 cursor-pointer hover:bg-gray-50 transition dark:hover:bg-gray-700/50',
                selectedItems.includes(item.id) ? 'bg-green-50 dark:bg-green-900/20' : ''
              ]"
            >
              <input 
                type="checkbox" 
                :checked="selectedItems.includes(item.id)"
                @change="toggleItemSelection(item.id)"
                class="w-4 h-4 text-red-600 rounded focus:ring-red-500 dark:bg-gray-600 dark:border-gray-500 dark:checked:bg-red-600 dark:checked:border-red-600"
              >
              <div class="w-12 h-12 bg-gray-200 rounded overflow-hidden flex-shrink-0 dark:bg-gray-600">
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
                <h4 class="font-medium truncate dark:text-white">{{ item.name }}</h4>
                <p class="text-sm text-gray-500 dark:text-gray-400">
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
          <button @click="closeAddItemsModal" class="text-gray-500 px-4 py-2 dark:text-gray-400">ยกเลิก</button>
          <button 
            @click="addItemsToBox" 
            :disabled="isProcessing || selectedItems.length === 0" 
            :class="{'opacity-50 cursor-not-allowed': isProcessing || selectedItems.length === 0}" 
            class="bg-green-600 text-white px-4 py-2 rounded flex items-center gap-2 dark:bg-green-600 dark:hover:bg-green-700"
          >
            <i v-if="isProcessing" class="fa-solid fa-spinner fa-spin"></i>
            <span>เพิ่ม {{ selectedItems.length }} รายการ</span>
          </button>
        </div>
      </template>
    </Modal>

    <!-- Delete Confirmation Modal -->
    <Modal v-model="modals.deleteBox" title="ยืนยันการลบ" variant="danger">
      <p class="text-gray-600 dark:text-gray-300">
        คุณต้องการลบ "<strong>{{ boxToDelete?.name }}</strong>" และรายการทั้งหมดภายในใช่หรือไม่?
      </p>
      <p class="text-red-500 text-sm mt-2">
        <i class="fa-solid fa-exclamation-triangle"></i> การกระทำนี้ไม่สามารถย้อนกลับได้
      </p>
      
      <template #footer>
        <div class="flex justify-end gap-2">
          <button @click="modals.deleteBox = false" class="text-gray-500 px-4 py-2 dark:text-gray-400">ยกเลิก</button>
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
      <p class="text-gray-600 dark:text-gray-300">
        <i v-if="reorderSuccess" class="fa-solid fa-check-circle text-green-500"></i>
        <i v-else class="fa-solid fa-times-circle text-red-500"></i>
        {{ reorderMessage }}
      </p>
      
      <template #footer>
        <div class="flex justify-end">
          <button @click="modals.reorderResult = false" class="bg-black text-white px-4 py-2 rounded dark:bg-red-600 dark:hover:bg-red-700">
            ตกลง
          </button>
        </div>
      </template>
    </Modal>

    <!-- Action Modal (Withdraw) -->
    <ActionModal 
      v-model="modals.action" 
      :is-processing="isProcessing"
      :item="selectedStockItem"
      :action-type="actionType"
      @submit="submitAction"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, onUnmounted } from 'vue';
import { supabase, type User } from '@/lib/supabase';
import Modal from '@/components/common/Modal.vue';
import ActionModal from '@/components/stock/modals/ActionModal.vue';
import type { DeliveryBox, DeliveryItemWithDetails, StockItem, ActionForm } from '@/components/stock/types';

// State
const currentUser = ref<User | null>(null);
const loading = ref(true);
const isProcessing = ref(false);
const isEditMode = ref(false); // โหมดแก้ไข - ต้องเปิดก่อนจึงจะแสดงเมนูแก้ไข
const boxes = ref<DeliveryBox[]>([]);
const stockItems = ref<StockItem[]>([]);
const loadingItems = ref(false);
const itemSearch = ref('');
const selectedItems = ref<number[]>([]);
const selectedBoxId = ref<number | null>(null);

// Withdraw Modal State
const selectedStockItem = ref<StockItem | null>(null);
const actionType = ref<'WITHDRAW' | 'RESTOCK' | ''>('WITHDRAW');

// Color Options for Box Header
const colorOptions = [
  { name: 'เทา', value: '#6b7280' },
  { name: 'แดง', value: '#ef4444' },
  { name: 'ส้ม', value: '#f97316' },
  { name: 'เหลือง', value: '#eab308' },
  { name: 'เขียว', value: '#22c55e' },
  { name: 'ฟ้า', value: '#14b8a6' },
  { name: 'น้ำเงิน', value: '#06b6d4' },
  { name: 'ฟ้าอ่อน', value: '#3b82f6' },
  { name: 'ม่วง', value: '#8b5cf6' },
  { name: 'ชมพู', value: '#ec4899' },
  { name: 'กุหลาบ', value: '#f43f5e' },
  { name: 'ดำ', value: '#1f2937' },
];

// Modals
const modals = reactive({
  createBox: false,
  editBox: false,
  addItems: false,
  deleteBox: false,
  reorderResult: false,
  action: false // Modal สำหรับเบิกของ
});

// Forms
const createBoxForm = reactive({
  name: '',
  description: '',
  headerColor: '#6b7280' // สีเริ่มต้น
});

const editBoxForm = reactive({
  id: null as number | null,
  name: '',
  description: '',
  headerColor: '#6b7280'
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

    const baseData = {
      name: createBoxForm.name.trim(),
      description: createBoxForm.description.trim() || null,
      position: maxPosition,
      created_by: currentUser.value?.id
    };

    // Try with header_color first, fallback without it if column doesn't exist
    let { data, error } = await supabase
      .from('delivery_boxes')
      .insert({ ...baseData, header_color: createBoxForm.headerColor })
      .select()
      .single();

    // If failed (possibly due to missing column), retry without header_color
    if (error && error.message?.includes('header_color')) {
      const result = await supabase
        .from('delivery_boxes')
        .insert(baseData)
        .select()
        .single();
      data = result.data;
      error = result.error;
    }

    if (error) throw error;
    
    boxes.value.push({ ...data, header_color: createBoxForm.headerColor, items: [] });
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
  editBoxForm.headerColor = box.header_color || '#6b7280';
  modals.editBox = true;
}

async function updateBox() {
  if (!editBoxForm.id || !editBoxForm.name.trim()) return;
  
  isProcessing.value = true;
  try {
    // Try with header_color first, fallback without it if column doesn't exist
    const updateData: Record<string, any> = {
      name: editBoxForm.name.trim(),
      description: editBoxForm.description.trim() || null
    };
    
    // Try to update with header_color
    let { error } = await supabase
      .from('delivery_boxes')
      .update({ ...updateData, header_color: editBoxForm.headerColor })
      .eq('id', editBoxForm.id);

    // If failed (possibly due to missing column), retry without header_color
    if (error && error.message?.includes('header_color')) {
      const result = await supabase
        .from('delivery_boxes')
        .update(updateData)
        .eq('id', editBoxForm.id);
      error = result.error;
    }

    if (error) throw error;
    
    const index = boxes.value.findIndex(b => b.id === editBoxForm.id);
    if (index !== -1) {
      boxes.value[index].name = editBoxForm.name.trim();
      boxes.value[index].description = editBoxForm.description.trim() || undefined;
      boxes.value[index].header_color = editBoxForm.headerColor;
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
  createBoxForm.headerColor = '#6b7280';
}

// คำนวณสีตัวอักษรที่คอนทราสต์กับสีพื้นหลัง
function getContrastColor(hexColor: string): string {
  // ลบ # ออกถ้ามี
  const color = hexColor.replace('#', '');
  
  // แปลงเป็น RGB
  const r = parseInt(color.substring(0, 2), 16);
  const g = parseInt(color.substring(2, 4), 16);
  const b = parseInt(color.substring(4, 6), 16);
  
  // คำนวณค่า luminance
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  
  // ถ้าสีสว่าง ใช้ตัวอักษรดำ ถ้าสีเข้ม ใช้ตัวอักษรขาว
  return luminance > 0.5 ? '#1f2937' : '#ffffff';
}

// ==========================================
// Withdraw Modal Functions
// ==========================================
function openWithdrawModal(item: any) {
  if (!item) return;
  
  // Convert delivery item info to StockItem format
  selectedStockItem.value = {
    id: item.id,
    name: item.name,
    description: item.description || '',
    quantity: item.quantity,
    total_quantity: item.quantity,
    image_url: item.image_url,
    is_active: true
  } as StockItem;
  
  actionType.value = 'WITHDRAW';
  modals.action = true;
}

async function submitAction(form: ActionForm) {
  if (isProcessing.value) return;
  
  const { itemId, type, amount, date, branch, actName, actLoc, actDate, note, userName } = form;
  const amountNum = parseInt(amount);
  
  if (!amountNum || !date) {
    showToast('กรุณากรอกข้อมูลวันที่และจำนวน', 'error');
    return;
  }
  
  if (type === 'WITHDRAW') {
    if (!branch || !actName || !actLoc || !actDate) {
      showToast('กรุณากรอกข้อมูลการเบิกให้ครบถ้วน', 'error');
      return;
    }
  }
  
  isProcessing.value = true;
  
  try {
    const { data: item } = await supabase.from('items').select('*').eq('id', itemId).single();
    
    if (!item) throw new Error('ไม่พบสินค้า');
    
    if (type === 'WITHDRAW' && item.quantity < amountNum) {
      throw new Error('สต็อกไม่พอเบิก!');
    }
    
    const newQty = type === 'WITHDRAW' ? item.quantity - amountNum : item.quantity + amountNum;
    const newTotal = type === 'WITHDRAW' ? item.total_quantity : item.total_quantity + amountNum;
    
    await supabase.from('items').update({ quantity: newQty, total_quantity: newTotal }).eq('id', itemId);
    
    await supabase.from('logs').insert({
      item_id: itemId,
      item_name: item.name,
      action_type: type,
      amount: amountNum,
      balance_after: newQty,
      report_date: date,
      user_name: userName || 'Admin',
      branch: type === 'WITHDRAW' ? branch : '-',
      note: note,
      activity_name: type === 'WITHDRAW' ? actName : null,
      activity_location: type === 'WITHDRAW' ? actLoc : null,
      activity_date: type === 'WITHDRAW' ? actDate : null,
      cost_per_unit: item.cost_per_unit || 0
    });
    
    showToast('บันทึกรายการเบิกสำเร็จ', 'success');
    modals.action = false;
    
    // Refresh boxes to update quantities
    await fetchBoxes();
  } catch (err: any) {
    showToast(err.message || 'บันทึกไม่สำเร็จ', 'error');
  } finally {
    isProcessing.value = false;
  }
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
