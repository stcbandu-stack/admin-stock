<template>
  <div>
    <!-- Add Button (Admin Only) -->
    <div v-if="currentUser" class="mb-6 flex justify-end">
      <button 
        @click="modals.add = true" 
        class="bg-black text-white px-4 py-2 rounded hover:bg-gray-800 shadow-lg flex items-center gap-2"
      >
        <i class="fa-solid fa-plus"></i> เพิ่มของชำร่วย
      </button>
    </div>
    
    <!-- Header with Search & View Toggle -->
    <div class="mb-6 flex flex-col md:flex-row justify-between items-center gap-4">
      <h2 class="text-xl font-bold border-l-4 border-red-600 pl-3">รายการของชำร่วยทั้งหมด</h2>
      <div class="flex items-center gap-3 w-full md:w-auto">
        <!-- View Toggle -->
        <div class="flex bg-white rounded-lg shadow-sm border border-gray-200 p-1">
          <button 
            @click="viewMode = 'grid'" 
            :class="viewMode === 'grid' ? 'bg-black text-white shadow' : 'text-gray-500 hover:bg-gray-100'" 
            class="px-3 py-1.5 rounded text-sm transition"
          >
            <i class="fa-solid fa-border-all"></i>
          </button>
          <button 
            @click="viewMode = 'list'" 
            :class="viewMode === 'list' ? 'bg-black text-white shadow' : 'text-gray-500 hover:bg-gray-100'" 
            class="px-3 py-1.5 rounded text-sm transition"
          >
            <i class="fa-solid fa-list"></i>
          </button>
        </div>
        
        <!-- Search -->
        <div class="relative w-full md:w-64">
          <input 
            type="text" 
            v-model="searchTerm" 
            placeholder="ค้นหาของชำร่วย..." 
            class="w-full border-2 border-gray-200 p-2 pl-10 rounded-full text-sm focus:border-red-600 outline-none transition shadow-sm"
          >
          <span class="absolute left-3 top-2.5 text-gray-400">
            <i class="fa-solid fa-magnifying-glass"></i>
          </span>
        </div>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="text-center py-20 text-gray-400 font-bold animate-pulse">
      กำลังโหลดข้อมูล...
    </div>

    <!-- Grid View -->
    <div v-else-if="viewMode === 'grid'" class="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-6 items-stretch">
      <ItemCard 
        v-for="item in filteredItems" 
        :key="item.id" 
        :item="item"
        :is-logged-in="!!currentUser"
        @restock="openAction(item, 'RESTOCK')"
        @withdraw="openAction(item, 'WITHDRAW')"
        @edit="openEditModal(item)"
        @delete="confirmDelete(item)"
        @update-inline="handleInlineUpdate"
        @update-image="handleImageUpdate"
      />
    </div>

    <!-- List View -->
    <div v-else class="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full text-left text-sm">
          <thead class="bg-gray-100 text-gray-700 uppercase tracking-wider text-xs">
            <tr>
              <th class="p-3">สินค้า</th>
              <th class="p-3 text-right">ต้นทุน/ชิ้น</th>
              <th class="p-3 text-center text-blue-700 bg-blue-50">รับเข้า</th>
              <th class="p-3 text-center text-red-700 bg-red-50">ใช้ไป</th>
              <th class="p-3 text-center text-green-700 bg-green-50">คงเหลือ</th>
              <th v-if="currentUser" class="p-3 text-center">จัดการ</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-100">
            <ItemRow 
              v-for="item in filteredItems" 
              :key="item.id" 
              :item="item"
              :is-logged-in="!!currentUser"
              @restock="openAction(item, 'RESTOCK')"
              @withdraw="openAction(item, 'WITHDRAW')"
              @edit="openEditModal(item)"
              @delete="confirmDelete(item)"
              @update-inline="handleInlineUpdate"
              @update-image="handleImageUpdate"
            />
          </tbody>
        </table>
      </div>
    </div>

    <!-- Login Modal -->
    <Modal v-model="modals.login" title="เข้าสู่ระบบ" size="sm">
      <div class="space-y-3">
        <input 
          type="email" 
          v-model="loginForm.email" 
          placeholder="Email" 
          class="w-full border p-2 rounded focus:border-red-600 outline-none"
          @keyup.enter="handleLogin"
        >
        <input 
          type="password" 
          v-model="loginForm.password" 
          placeholder="Password" 
          class="w-full border p-2 rounded focus:border-red-600 outline-none"
          @keyup.enter="handleLogin"
        >
      </div>
      <template #footer>
        <div class="flex justify-end gap-2">
          <button @click="modals.login = false" class="text-gray-500 text-sm">ยกเลิก</button>
          <button 
            @click="handleLogin" 
            :disabled="isProcessing"
            :class="{'opacity-50 cursor-not-allowed': isProcessing}"
            class="bg-black text-white px-4 py-2 rounded flex items-center gap-2"
          >
            <i v-if="isProcessing" class="fa-solid fa-spinner fa-spin"></i>
            <span>เข้าสู่ระบบ</span>
          </button>
        </div>
      </template>
    </Modal>

    <!-- Add Modal -->
    <AddItemModal 
      v-model="modals.add" 
      :is-processing="isProcessing"
      @submit="addItem"
    />

    <!-- Edit Modal -->
    <EditItemModal 
      v-model="modals.edit" 
      :is-processing="isProcessing"
      :item="selectedItem"
      @submit="submitEdit"
    />

    <!-- Action Modal (Restock/Withdraw) -->
    <ActionModal 
      v-model="modals.action" 
      :is-processing="isProcessing"
      :item="selectedItem"
      :action-type="actionType"
      @submit="submitAction"
    />

    <!-- Confirm Delete Modal -->
    <Modal v-model="modals.confirm" size="md">
      <div class="text-center py-4">
        <i class="fa-solid fa-circle-question text-6xl text-yellow-500 mb-4"></i>
        <h2 class="text-2xl font-bold mb-2">ยืนยันการลบ?</h2>
        <p class="text-gray-500 mb-6 text-lg">{{ confirmMessage }}</p>
        <div class="flex gap-3 justify-center">
          <button 
            @click="modals.confirm = false" 
            class="px-6 py-2 bg-gray-200 rounded-lg font-bold text-gray-700"
          >
            ยกเลิก
          </button>
          <button 
            @click="executeDelete" 
            :disabled="isProcessing"
            :class="{'opacity-50 cursor-not-allowed': isProcessing}"
            class="px-6 py-2 bg-red-600 text-white rounded-lg font-bold flex items-center gap-2"
          >
            <i v-if="isProcessing" class="fa-solid fa-spinner fa-spin"></i>
            <span>ยืนยันลบ</span>
          </button>
        </div>
      </div>
    </Modal>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, onUnmounted } from 'vue';
import { supabase, type User } from '@/lib/supabase';
import Modal from '@/components/common/Modal.vue';
import ItemCard from './ItemCard.vue';
import ItemRow from './ItemRow.vue';
import AddItemModal from './modals/AddItemModal.vue';
import EditItemModal from './modals/EditItemModal.vue';
import ActionModal from './modals/ActionModal.vue';
import type { StockItem, ActionForm, AddItemForm, EditItemForm } from './types';

// State
const currentUser = ref<User | null>(null);
const isVip = ref(false);
const loading = ref(false);
const isProcessing = ref(false);
const viewMode = ref<'grid' | 'list'>('grid');
const searchTerm = ref('');

const items = ref<StockItem[]>([]);
const selectedItem = ref<StockItem | null>(null);
const actionType = ref<'RESTOCK' | 'WITHDRAW' | ''>('');
const confirmMessage = ref('');
let pendingDeleteItem: StockItem | null = null;

const modals = reactive({
  login: false,
  add: false,
  edit: false,
  action: false,
  confirm: false
});

const loginForm = reactive({
  email: '',
  password: ''
});

// Computed
const filteredItems = computed(() => {
  const term = searchTerm.value.toLowerCase();
  return items.value.filter(i => 
    i.name.toLowerCase().includes(term) || 
    (i.description || '').toLowerCase().includes(term)
  );
});

// Toast helper
function showToast(message: string, type: 'success' | 'error' | 'warning' | 'info' = 'success') {
  window.dispatchEvent(new CustomEvent('show-toast', { detail: { message, type } }));
}

// Auth
async function checkUser() {
  const { data: { session } } = await supabase.auth.getSession();
  currentUser.value = session?.user || null;
  
  if (currentUser.value) {
    const { data } = await supabase
      .from('user_permissions')
      .select('can_backdate')
      .eq('email', currentUser.value.email)
      .single();
    isVip.value = !!(data && data.can_backdate);
  } else {
    isVip.value = false;
  }
}

async function handleLogin() {
  if (isProcessing.value) return;
  isProcessing.value = true;
  
  try {
    const { error } = await supabase.auth.signInWithPassword({
      email: loginForm.email,
      password: loginForm.password
    });
    
    if (error) {
      showToast('อีเมลหรือรหัสผ่านไม่ถูกต้อง', 'error');
    } else {
      showToast('ยินดีต้อนรับ Admin', 'success');
      await checkUser();
      modals.login = false;
      loginForm.email = '';
      loginForm.password = '';
      loadItems();
    }
  } finally {
    isProcessing.value = false;
  }
}

// Items
async function loadItems() {
  loading.value = true;
  const { data, error } = await supabase
    .from('items')
    .select('*')
    .eq('is_active', true)
    .order('quantity', { ascending: false });
    
  if (!error) {
    items.value = data || [];
  }
  loading.value = false;
}

async function addItem(form: AddItemForm) {
  if (isProcessing.value) return;
  if (!form.name || !form.qty) {
    showToast('กรุณากรอกชื่อและจำนวน', 'warning');
    return;
  }
  
  isProcessing.value = true;
  try {
    let imageUrl = '';
    if (form.file) {
      const fileName = `item-${Date.now()}.${form.file.name.split('.').pop()}`;
      await supabase.storage.from('item-images').upload(fileName, form.file);
      imageUrl = supabase.storage.from('item-images').getPublicUrl(fileName).data.publicUrl;
    }
    
    const { data: newItem, error } = await supabase.from('items').insert({
      name: form.name,
      description: form.desc,
      quantity: parseInt(form.qty),
      total_quantity: parseInt(form.qty),
      image_url: imageUrl,
      cost_per_unit: parseFloat(form.cost) || 0
    }).select().single();
    
    if (error) throw error;
    
    await supabase.from('logs').insert({
      item_id: newItem.id,
      item_name: newItem.name,
      action_type: 'ADD_NEW',
      amount: parseInt(form.qty),
      balance_after: parseInt(form.qty),
      report_date: new Date().toISOString().split('T')[0],
      user_name: 'Admin',
      branch: '-',
      note: 'เพิ่มของชำร่วยเข้าระบบ',
      cost_per_unit: parseFloat(form.cost) || 0
    });
    
    showToast('เพิ่มสินค้าใหม่สำเร็จ', 'success');
    modals.add = false;
    loadItems();
  } catch (error) {
    showToast('เกิดข้อผิดพลาดในการบันทึก', 'error');
    console.error(error);
  } finally {
    isProcessing.value = false;
  }
}

function openEditModal(item: StockItem) {
  selectedItem.value = item;
  modals.edit = true;
}

async function submitEdit(form: EditItemForm) {
  if (isProcessing.value) return;
  isProcessing.value = true;
  
  try {
    const updateData: Partial<StockItem> = {
      name: form.name,
      description: form.desc,
      cost_per_unit: parseFloat(form.cost) || 0
    };
    
    if (form.file) {
      const fileName = `edit-${Date.now()}.${form.file.name.split('.').pop()}`;
      await supabase.storage.from('item-images').upload(fileName, form.file);
      updateData.image_url = supabase.storage.from('item-images').getPublicUrl(fileName).data.publicUrl;
    }
    
    await supabase.from('items').update(updateData).eq('id', form.id);
    showToast('แก้ไขข้อมูลเรียบร้อย', 'success');
    modals.edit = false;
    loadItems();
  } catch (error) {
    showToast('แก้ไขไม่สำเร็จ', 'error');
  } finally {
    isProcessing.value = false;
  }
}

function confirmDelete(item: StockItem) {
  pendingDeleteItem = item;
  confirmMessage.value = `คุณต้องการลบ "${item.name}" ใช่หรือไม่?`;
  modals.confirm = true;
}

async function executeDelete() {
  if (isProcessing.value || !pendingDeleteItem) return;
  isProcessing.value = true;
  
  try {
    await supabase.from('logs').insert({
      item_id: pendingDeleteItem.id,
      item_name: pendingDeleteItem.name,
      action_type: 'DELETE',
      amount: 0,
      balance_after: 0,
      report_date: new Date().toISOString().split('T')[0],
      user_name: 'Admin',
      branch: '-',
      note: 'Archived',
      cost_per_unit: pendingDeleteItem.cost_per_unit || 0
    });
    
    await supabase.from('items').update({ is_active: false }).eq('id', pendingDeleteItem.id);
    showToast(`ลบ "${pendingDeleteItem.name}" สำเร็จ`, 'success');
    loadItems();
    modals.confirm = false;
    pendingDeleteItem = null;
  } catch (err) {
    showToast('ลบไม่สำเร็จ', 'error');
  } finally {
    isProcessing.value = false;
  }
}

async function handleInlineUpdate(item: StockItem, updates: Partial<StockItem>) {
  try {
    const { error } = await supabase
      .from('items')
      .update(updates)
      .eq('id', item.id);
      
    if (error) throw error;
    
    // Update local state
    Object.assign(item, updates);
    showToast('บันทึกการแก้ไขแล้ว', 'success');
  } catch (error) {
    showToast('บันทึกไม่สำเร็จ', 'error');
    console.error(error);
  }
}

async function handleImageUpdate(item: StockItem, file: File) {
  try {
    const fileName = `item-${Date.now()}.${file.name.split('.').pop()}`;
    await supabase.storage.from('item-images').upload(fileName, file);
    const imageUrl = supabase.storage.from('item-images').getPublicUrl(fileName).data.publicUrl;
    
    const { error } = await supabase
      .from('items')
      .update({ image_url: imageUrl })
      .eq('id', item.id);
      
    if (error) throw error;
    
    item.image_url = imageUrl;
    showToast('อัปเดตรูปภาพเรียบร้อย', 'success');
  } catch (error) {
    showToast('อัปเดตรูปภาพไม่สำเร็จ', 'error');
    console.error(error);
  }
}

function openAction(item: StockItem, type: 'RESTOCK' | 'WITHDRAW') {
  selectedItem.value = item;
  actionType.value = type;
  modals.action = true;
}

async function submitAction(form: ActionForm) {
  if (isProcessing.value) return;
  
  const { itemId, type, amount, date, branch, actName, actLoc, actDate, note, userName } = form;
  const amountNum = parseInt(amount);
  
  if (!amountNum || !date) {
    showToast('กรุณากรอกข้อมูลวันที่และจำนวน', 'warning');
    return;
  }
  
  if (type === 'WITHDRAW') {
    if (!branch || !actName || !actLoc || !actDate) {
      showToast('กรุณากรอกข้อมูลการเบิกให้ครบถ้วน', 'warning');
      return;
    }
    const dReport = new Date(date);
    const dActivity = new Date(actDate);
    dReport.setHours(0, 0, 0, 0);
    dActivity.setHours(0, 0, 0, 0);
    if (dReport > dActivity && !isVip.value) {
      showToast('หากต้องการคีย์ย้อนหลัง โปรดติดต่อผู้ดูแลระบบ', 'error');
      return;
    }
  }
  
  isProcessing.value = true;
  
  try {
    const { data: item } = await supabase.from('items').select('*').eq('id', itemId).single();
    
    if (!item) throw new Error('ไม่พบสินค้า');
    
    let newQty = 0;
    let newTotal = item.total_quantity;
    
    if (type === 'WITHDRAW') {
      if (item.quantity < amountNum) throw new Error('สต็อกไม่พอเบิก!');
      newQty = item.quantity - amountNum;
    } else {
      newQty = item.quantity + amountNum;
      newTotal = item.total_quantity + amountNum;
    }
    
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
    
    showToast('บันทึกรายการสำเร็จ', 'success');
    modals.action = false;
    loadItems();
  } catch (err: any) {
    showToast(err.message || 'บันทึกไม่สำเร็จ', 'error');
  } finally {
    isProcessing.value = false;
  }
}

// Auth event listener
function handleAuthChange(e: CustomEvent) {
  currentUser.value = e.detail.user;
  if (e.detail.user) {
    checkUser();
  } else {
    isVip.value = false;
  }
}

// Expose login modal for navbar
function openLoginModal() {
  modals.login = true;
}

onMounted(async () => {
  await checkUser();
  loadItems();
  window.addEventListener('auth-change', handleAuthChange as EventListener);
  window.addEventListener('open-login', openLoginModal);
});

onUnmounted(() => {
  window.removeEventListener('auth-change', handleAuthChange as EventListener);
  window.removeEventListener('open-login', openLoginModal);
});

defineExpose({ openLoginModal });
</script>
