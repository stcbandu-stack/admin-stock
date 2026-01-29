<template>
  <div>
    <!-- Header -->
    <div class="flex justify-between items-center mb-6">
      <h2 class="text-2xl font-bold border-l-4 border-red-600 pl-3">ประวัติการทำรายการ</h2>
    </div>

    <!-- Filters -->
    <div class="bg-white p-4 rounded-xl shadow-sm border border-gray-100 mb-6">
      <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
        <!-- Month Filter -->
        <div class="relative">
          <label class="text-xs font-bold text-gray-500 ml-1">
            <i class="fa-solid fa-calendar-check text-red-600"></i> เลือกเดือน
          </label>
          <select 
            v-model="filters.month" 
            @change="loadLogs(true)" 
            class="w-full border-2 border-gray-100 p-2 rounded-lg text-sm outline-none focus:border-red-600"
          >
            <option value="">ทั้งหมดทุกเดือน</option>
            <option value="01">มกราคม</option>
            <option value="02">กุมภาพันธ์</option>
            <option value="03">มีนาคม</option>
            <option value="04">เมษายน</option>
            <option value="05">พฤษภาคม</option>
            <option value="06">มิถุนายน</option>
            <option value="07">กรกฎาคม</option>
            <option value="08">สิงหาคม</option>
            <option value="09">กันยายน</option>
            <option value="10">ตุลาคม</option>
            <option value="11">พฤศจิกายน</option>
            <option value="12">ธันวาคม</option>
          </select>
        </div>
        
        <!-- Item Name Filter -->
        <div class="relative">
          <label class="text-xs font-bold text-gray-500 ml-1">
            <i class="fa-solid fa-box text-red-600"></i> ชื่อสินค้า
          </label>
          <input 
            type="text" 
            v-model="filters.itemName" 
            @input="debouncedLoad" 
            placeholder="พิมพ์ชื่อสินค้า..." 
            class="w-full border-2 border-gray-100 p-2 rounded-lg text-sm outline-none focus:border-red-600"
          >
        </div>
        
        <!-- Branch Filter -->
        <div class="relative">
          <label class="text-xs font-bold text-gray-500 ml-1">
            <i class="fa-solid fa-location-dot text-red-600"></i> สาขา
          </label>
          <input 
            type="text" 
            v-model="filters.branch" 
            @input="debouncedLoad" 
            placeholder="พิมพ์ชื่อสาขา..." 
            class="w-full border-2 border-gray-100 p-2 rounded-lg text-sm outline-none focus:border-red-600"
          >
        </div>
        
        <!-- Export Button -->
        <div class="flex items-end">
          <button 
            @click="exportToCSV" 
            class="w-full bg-green-600 text-white py-2 rounded-lg font-bold hover:bg-green-700 transition flex items-center justify-center gap-2"
          >
            <i class="fa-solid fa-file-csv"></i> Export CSV
          </button>
        </div>
      </div>
    </div>

    <!-- Table -->
    <div class="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full text-left text-sm">
          <thead>
            <tr class="bg-gray-100 text-gray-700 uppercase tracking-wider">
              <th class="p-3">วันที่</th>
              <th class="p-3">สินค้า</th>
              <th class="p-3 text-center">ประเภท</th>
              <th class="p-3">ผู้ทำ</th>
              <th class="p-3">สาขา</th>
              <th class="p-3">กิจกรรม</th>
              <th class="p-3">สถานที่</th>
              <th class="p-3">วันงาน</th>
              <th class="p-3">หมายเหตุ</th>
              <th class="p-3 text-right">จำนวน</th>
              <th class="p-3 text-right">คงเหลือ</th>
              <th class="p-3 text-right">ต้นทุน</th>
              <th class="p-3 text-right">มูลค่ารวม</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="loading">
              <td colspan="13" class="p-10 text-center text-gray-400 animate-pulse font-bold">
                กำลังโหลดข้อมูล...
              </td>
            </tr>
            <tr v-else-if="logs.length === 0">
              <td colspan="13" class="p-10 text-center text-gray-400 font-bold">
                ไม่พบข้อมูล
              </td>
            </tr>
            <tr 
              v-for="log in logs" 
              :key="log.id" 
              class="border-b hover:bg-gray-50 text-xs md:text-sm"
            >
              <td class="p-3 text-gray-500 whitespace-nowrap">{{ formatDate(log.report_date) }}</td>
              <td class="p-3 font-semibold text-gray-700">{{ log.items?.name || log.item_name }}</td>
              <td class="p-3 text-center whitespace-nowrap" v-html="getLogBadge(log.action_type)"></td>
              
              <!-- User Name -->
              <td class="p-3 group/cell relative" @dblclick="isSuperUser && startEdit(log, 'user_name')">
                <div v-if="editingCell?.id === log.id && editingCell?.field === 'user_name'" class="flex items-center gap-1">
                  <input 
                    v-model="editValue"
                    ref="editInput"
                    class="w-full min-w-[100px] border border-black rounded px-2 py-1 text-xs"
                    @keyup.enter="saveEdit"
                    @keyup.esc="cancelEdit"
                  >
                  <button @click="saveEdit" class="text-green-600 hover:bg-green-50 p-1"><i class="fa-solid fa-check text-xs"></i></button>
                  <button @click="cancelEdit" class="text-red-500 hover:bg-red-50 p-1"><i class="fa-solid fa-xmark text-xs"></i></button>
                </div>
                <div v-else class="flex items-center gap-2">
                  <span>{{ log.action_type === 'WITHDRAW' ? log.user_name : 'Admin' }}</span>
                  <button v-if="isSuperUser && log.action_type === 'WITHDRAW'" @click="startEdit(log, 'user_name')" class="text-gray-400 hover:text-black hover:scale-110 opacity-0 group-hover/cell:opacity-100 transition">
                    <i class="fa-solid fa-pen text-[9px]"></i>
                  </button>
                </div>
              </td>

              <!-- Branch -->
              <td class="p-3 text-gray-600 group/cell relative" @dblclick="isSuperUser && log.action_type === 'WITHDRAW' && startEdit(log, 'branch')">
                <div v-if="editingCell?.id === log.id && editingCell?.field === 'branch'" class="flex items-center gap-1">
                  <input 
                    v-model="editValue"
                    ref="editInput"
                    class="w-full min-w-[100px] border border-black rounded px-2 py-1 text-xs"
                    @keyup.enter="saveEdit"
                    @keyup.esc="cancelEdit"
                  >
                  <button @click="saveEdit" class="text-green-600 hover:bg-green-50 p-1"><i class="fa-solid fa-check text-xs"></i></button>
                  <button @click="cancelEdit" class="text-red-500 hover:bg-red-50 p-1"><i class="fa-solid fa-xmark text-xs"></i></button>
                </div>
                <div v-else class="flex items-center gap-2">
                  <span v-if="log.action_type === 'WITHDRAW'">{{ log.branch }}</span>
                  <span v-else class="text-gray-300">-</span>
                  <button v-if="isSuperUser && log.action_type === 'WITHDRAW'" @click="startEdit(log, 'branch')" class="text-gray-400 hover:text-black hover:scale-110 opacity-0 group-hover/cell:opacity-100 transition">
                    <i class="fa-solid fa-pen text-[9px]"></i>
                  </button>
                </div>
              </td>

              <!-- Activity Name -->
              <td class="p-3 group/cell relative" @dblclick="isSuperUser && log.action_type === 'WITHDRAW' && startEdit(log, 'activity_name')">
                <div v-if="editingCell?.id === log.id && editingCell?.field === 'activity_name'" class="flex items-center gap-1">
                  <input 
                    v-model="editValue"
                    ref="editInput"
                    class="w-full min-w-[100px] border border-black rounded px-2 py-1 text-xs"
                    @keyup.enter="saveEdit"
                    @keyup.esc="cancelEdit"
                  >
                  <button @click="saveEdit" class="text-green-600 hover:bg-green-50 p-1"><i class="fa-solid fa-check text-xs"></i></button>
                  <button @click="cancelEdit" class="text-red-500 hover:bg-red-50 p-1"><i class="fa-solid fa-xmark text-xs"></i></button>
                </div>
                <div v-else class="flex items-center gap-2">
                  <span>{{ log.action_type === 'WITHDRAW' ? (log.activity_name || '-') : '-' }}</span>
                  <button v-if="isSuperUser && log.action_type === 'WITHDRAW'" @click="startEdit(log, 'activity_name')" class="text-gray-400 hover:text-black hover:scale-110 opacity-0 group-hover/cell:opacity-100 transition">
                    <i class="fa-solid fa-pen text-[9px]"></i>
                  </button>
                </div>
              </td>

              <!-- Activity Location -->
              <td class="p-3 text-gray-500 group/cell relative" @dblclick="isSuperUser && log.action_type === 'WITHDRAW' && startEdit(log, 'activity_location')">
                <div v-if="editingCell?.id === log.id && editingCell?.field === 'activity_location'" class="flex items-center gap-1">
                  <input 
                    v-model="editValue"
                    ref="editInput"
                    class="w-full min-w-[100px] border border-black rounded px-2 py-1 text-xs"
                    @keyup.enter="saveEdit"
                    @keyup.esc="cancelEdit"
                  >
                  <button @click="saveEdit" class="text-green-600 hover:bg-green-50 p-1"><i class="fa-solid fa-check text-xs"></i></button>
                  <button @click="cancelEdit" class="text-red-500 hover:bg-red-50 p-1"><i class="fa-solid fa-xmark text-xs"></i></button>
                </div>
                <div v-else class="flex items-center gap-2">
                  <span>{{ log.action_type === 'WITHDRAW' ? (log.activity_location || '-') : '-' }}</span>
                  <button v-if="isSuperUser && log.action_type === 'WITHDRAW'" @click="startEdit(log, 'activity_location')" class="text-gray-400 hover:text-black hover:scale-110 opacity-0 group-hover/cell:opacity-100 transition">
                    <i class="fa-solid fa-pen text-[9px]"></i>
                  </button>
                </div>
              </td>

              <!-- Activity Date -->
              <td class="p-3 text-gray-500 whitespace-nowrap group/cell relative" @dblclick="isSuperUser && log.action_type === 'WITHDRAW' && startEdit(log, 'activity_date')">
                <div v-if="editingCell?.id === log.id && editingCell?.field === 'activity_date'" class="flex items-center gap-1">
                  <input 
                    v-model="editValue"
                    ref="editInput"
                    type="date"
                    class="w-full border border-black rounded px-2 py-1 text-xs"
                    @keyup.enter="saveEdit"
                    @keyup.esc="cancelEdit"
                  >
                  <button @click="saveEdit" class="text-green-600 hover:bg-green-50 p-1"><i class="fa-solid fa-check text-xs"></i></button>
                  <button @click="cancelEdit" class="text-red-500 hover:bg-red-50 p-1"><i class="fa-solid fa-xmark text-xs"></i></button>
                </div>
                <div v-else class="flex items-center gap-2">
                  <span>{{ log.action_type === 'WITHDRAW' ? formatDate(log.activity_date) : '-' }}</span>
                  <button v-if="isSuperUser && log.action_type === 'WITHDRAW'" @click="startEdit(log, 'activity_date')" class="text-gray-400 hover:text-black hover:scale-110 opacity-0 group-hover/cell:opacity-100 transition">
                    <i class="fa-solid fa-pen text-[9px]"></i>
                  </button>
                </div>
              </td>

              <!-- Note -->
              <td class="p-3 text-gray-400 italic group/cell relative" @dblclick="isSuperUser && startEdit(log, 'note')">
                <div v-if="editingCell?.id === log.id && editingCell?.field === 'note'" class="flex items-center gap-1">
                  <input 
                    v-model="editValue"
                    ref="editInput"
                    class="w-full min-w-[150px] border border-black rounded px-2 py-1 text-xs"
                    @keyup.enter="saveEdit"
                    @keyup.esc="cancelEdit"
                  >
                  <button @click="saveEdit" class="text-green-600 hover:bg-green-50 p-1"><i class="fa-solid fa-check text-xs"></i></button>
                  <button @click="cancelEdit" class="text-red-500 hover:bg-red-50 p-1"><i class="fa-solid fa-xmark text-xs"></i></button>
                </div>
                <div v-else class="flex items-center gap-2">
                  <span class="truncate max-w-[150px] inline-block">{{ log.note || '-' }}</span>
                  <button v-if="isSuperUser" @click="startEdit(log, 'note')" class="text-gray-400 hover:text-black hover:scale-110 opacity-0 group-hover/cell:opacity-100 transition">
                    <i class="fa-solid fa-pen text-[9px]"></i>
                  </button>
                </div>
              </td>

              <td class="p-3 text-right font-bold" :class="getAmountClass(log.action_type)">
                {{ getAmountPrefix(log.action_type) }}{{ log.amount }}
              </td>
              <td class="p-3 text-right font-mono font-bold text-blue-600 bg-blue-50">{{ log.balance_after ?? '-' }}</td>
              <td class="p-3 text-right text-gray-500 font-mono">
                {{ log.cost_per_unit > 0 ? log.cost_per_unit.toLocaleString() : '-' }}
              </td>
              <td class="p-3 text-right font-bold text-gray-700 font-mono">
                {{ (log.cost_per_unit * log.amount) > 0 ? (log.cost_per_unit * log.amount).toLocaleString() : '-' }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      
      <!-- Pagination -->
      <div class="bg-gray-50 p-4 border-t border-gray-100 flex flex-col md:flex-row justify-between items-center gap-4">
        <span class="text-xs text-gray-500 font-bold">
          รายการที่ {{ pagination.currentPage * pagination.pageSize + 1 }} - 
          {{ Math.min((pagination.currentPage + 1) * pagination.pageSize, pagination.totalCount) }} 
          จากทั้งหมด {{ pagination.totalCount }}
        </span>
        <div class="flex items-center gap-2">
          <button 
            @click="changePage(-1)" 
            :disabled="pagination.currentPage === 0" 
            class="w-8 h-8 flex items-center justify-center bg-white border rounded shadow-sm text-gray-400 disabled:opacity-50 hover:bg-gray-50"
          >
            <i class="fa-solid fa-chevron-left"></i>
          </button>
          <div class="flex items-center gap-1 bg-white border rounded px-2 py-1 shadow-sm">
            <span class="text-xs text-gray-400">หน้า</span>
            <input 
              type="number" 
              :value="pagination.currentPage + 1" 
              @change="jumpToPage(($event.target as HTMLInputElement).value)" 
              class="w-12 text-center text-sm font-bold text-gray-700 outline-none focus:text-red-600"
              min="1"
              :max="pagination.totalPages"
            >
            <span class="text-xs text-gray-400">/ {{ pagination.totalPages }}</span>
          </div>
          <button 
            @click="changePage(1)" 
            :disabled="(pagination.currentPage + 1) >= pagination.totalPages" 
            class="w-8 h-8 flex items-center justify-center bg-white border rounded shadow-sm text-gray-400 disabled:opacity-50 hover:bg-gray-50"
          >
            <i class="fa-solid fa-chevron-right"></i>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, nextTick } from 'vue';
import { supabase, type User } from '@/lib/supabase';
import type { LogEntry } from '@/components/stock/types';

// State
const loading = ref(false);
const logs = ref<LogEntry[]>([]);
const currentUser = ref<User | null>(null);
const isSuperUser = ref(false);

const editingCell = ref<{id: number, field: string} | null>(null);
const editValue = ref<any>(null);
const editInput = ref<HTMLInputElement | null>(null);


const filters = reactive({
  month: '',
  branch: '',
  itemName: ''
});

const pagination = reactive({
  currentPage: 0,
  pageSize: 25,
  totalCount: 0,
  totalPages: 1
});

// Debounce timer
let debounceTimer: ReturnType<typeof setTimeout> | null = null;

function debouncedLoad() {
  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => loadLogs(true), 300);
}

// Load logs
async function loadLogs(resetPage = false) {
  if (resetPage) {
    pagination.currentPage = 0;
  }
  
  loading.value = true;
  
  let query = supabase
    .from('logs')
    .select('*, items(name)', { count: 'exact' });
  
  // Apply filters
  if (filters.month) {
    const year = new Date().getFullYear();
    query = query
      .gte('report_date', `${year}-${filters.month}-01`)
      .lte('report_date', `${year}-${filters.month}-31`);
  }
  if (filters.branch) {
    query = query.ilike('branch', `%${filters.branch}%`);
  }
  if (filters.itemName) {
    query = query.ilike('item_name', `%${filters.itemName}%`);
  }
  
  // Pagination
  const from = pagination.currentPage * pagination.pageSize;
  const to = from + pagination.pageSize - 1;
  
  let { data, error, count } = await query
    .order('created_at', { ascending: false })
    .range(from, to);
  
  // Fallback without items join
  if (error) {
    let fbQuery = supabase
      .from('logs')
      .select('*', { count: 'exact' });
    
    if (filters.month) {
      const year = new Date().getFullYear();
      fbQuery = fbQuery
        .gte('report_date', `${year}-${filters.month}-01`)
        .lte('report_date', `${year}-${filters.month}-31`);
    }
    if (filters.branch) {
      fbQuery = fbQuery.ilike('branch', `%${filters.branch}%`);
    }
    if (filters.itemName) {
      fbQuery = fbQuery.ilike('item_name', `%${filters.itemName}%`);
    }
    
    const res = await fbQuery
      .order('created_at', { ascending: false })
      .range(from, to);
    
    data = res.data;
    count = res.count;
  }
  
  logs.value = data || [];
  pagination.totalCount = count || 0;
  pagination.totalPages = Math.ceil((count || 0) / pagination.pageSize) || 1;
  loading.value = false;
}

// Toast helper
function showToast(message: string, type: 'success' | 'error' | 'warning' | 'info' = 'success') {
  window.dispatchEvent(new CustomEvent('show-toast', { detail: { message, type } }));
}

// Export to CSV
async function exportToCSV() {
  showToast('กำลังประมวลผลข้อมูล...', 'info');
  
  let query = supabase.from('logs').select('*, items(name)');
  
  if (filters.month) {
    const year = new Date().getFullYear();
    query = query
      .gte('report_date', `${year}-${filters.month}-01`)
      .lte('report_date', `${year}-${filters.month}-31`);
  }
  if (filters.branch) {
    query = query.ilike('branch', `%${filters.branch}%`);
  }
  if (filters.itemName) {
    query = query.ilike('item_name', `%${filters.itemName}%`);
  }
  
  let { data, error } = await query.order('created_at', { ascending: false });
  
  if (error) {
    let fbQuery = supabase.from('logs').select('*');
    if (filters.month) {
      const year = new Date().getFullYear();
      fbQuery = fbQuery
        .gte('report_date', `${year}-${filters.month}-01`)
        .lte('report_date', `${year}-${filters.month}-31`);
    }
    if (filters.branch) {
      fbQuery = fbQuery.ilike('branch', `%${filters.branch}%`);
    }
    if (filters.itemName) {
      fbQuery = fbQuery.ilike('item_name', `%${filters.itemName}%`);
    }
    const res = await fbQuery.order('created_at', { ascending: false });
    data = res.data;
  }
  
  if (!data || data.length === 0) {
    showToast('ไม่พบข้อมูลที่จะ Export', 'warning');
    return;
  }
  
  let csvContent = "\uFEFFวันที่ทำรายการ,รายการสินค้า,ประเภทรายการ,ผู้ทำรายการ,สาขา,ชื่อกิจกรรม,สถานที่,วันที่จัดกิจกรรม,หมายเหตุ,จำนวน,ยอดคงเหลือ,ต้นทุนต่อชิ้น,มูลค่ารวม\n";
  
  data.forEach((log: any) => {
    const date = log.report_date ? new Date(log.report_date).toLocaleDateString('th-TH') : '-';
    const itemName = log.items ? log.items.name : log.item_name;
    
    let typeThai = '';
    switch (log.action_type) {
      case 'WITHDRAW': typeThai = 'เบิกออก'; break;
      case 'RESTOCK': typeThai = 'เติมสต็อก'; break;
      case 'ADD_NEW': typeThai = 'เพิ่มของใหม่'; break;
      case 'DELETE': typeThai = 'ลบสินค้า'; break;
      default: typeThai = 'ทั่วไป';
    }
    
    const amount = (log.action_type === 'WITHDRAW' ? '-' : '+') + log.amount;
    const totalVal = (log.cost_per_unit || 0) * log.amount;
    const cleanNote = (log.note || '-').replace(/"/g, '""');
    
    csvContent += `"${date}","${itemName}","${typeThai}","${log.user_name || '-'}","${log.branch || '-'}","${log.activity_name || '-'}","${log.activity_location || '-'}","${log.activity_date || '-'}","${cleanNote}","${amount}","${log.balance_after}","${log.cost_per_unit || 0}","${totalVal}"\n`;
  });
  
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `StockReport_${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  showToast(`ดาวน์โหลดเรียบร้อย (${data.length} รายการ)`, 'success');
}

// Helpers
function formatDate(dateStr: string | null | undefined): string {
  return !dateStr ? '-' : new Date(dateStr).toLocaleDateString('th-TH');
}

function getLogBadge(type: string): string {
  switch (type) {
    case 'WITHDRAW':
      return `<span class="bg-red-100 text-red-700 px-2 py-1 rounded-md text-xs font-bold border border-red-200"><i class="fa-solid fa-minus"></i> เบิกออก</span>`;
    case 'RESTOCK':
      return `<span class="bg-green-100 text-green-700 px-2 py-1 rounded-md text-xs font-bold border border-green-200"><i class="fa-solid fa-plus"></i> เติมสต็อก</span>`;
    case 'ADD_NEW':
      return `<span class="bg-blue-100 text-blue-700 px-2 py-1 rounded-md text-xs font-bold border border-blue-200"><i class="fa-solid fa-star"></i> เพิ่มของใหม่</span>`;
    case 'DELETE':
      return `<span class="bg-gray-100 text-gray-600 px-2 py-1 rounded-md text-xs font-bold border border-gray-200"><i class="fa-solid fa-trash"></i> ลบสินค้า</span>`;
    default:
      return `<span class="bg-gray-100 text-gray-500 px-2 py-1 rounded text-xs">ทั่วไป</span>`;
  }
}

function getAmountClass(type: string): string {
  return type === 'WITHDRAW' ? 'text-red-600' : (type === 'DELETE' ? 'text-gray-400' : 'text-green-600');
}

function getAmountPrefix(type: string): string {
  return type === 'WITHDRAW' ? '-' : (type === 'DELETE' ? '' : '+');
}

function changePage(dir: number) {
  const newPage = pagination.currentPage + dir;
  if (newPage >= 0 && newPage < pagination.totalPages) {
    pagination.currentPage = newPage;
    loadLogs();
  }
}

function jumpToPage(val: string) {
  const page = parseInt(val) - 1;
  if (page >= 0 && page < pagination.totalPages) {
    pagination.currentPage = page;
    loadLogs();
  }
}

// Auth & Edit functions
async function checkUser() {
  const { data: { session } } = await supabase.auth.getSession();
  currentUser.value = session?.user || null;
  
  if (currentUser.value) {
    const { data } = await supabase
      .from('user_permissions')
      .select('role')
      .eq('email', currentUser.value.email)
      .single();
    isSuperUser.value = data?.role === 'superuser';
  } else {
    isSuperUser.value = false;
  }
}

function startEdit(log: LogEntry, field: string) {
  if (!isSuperUser.value) return;
  
  editingCell.value = { id: log.id, field };
  // @ts-ignore
  editValue.value = log[field as keyof LogEntry];
  
  nextTick(() => {
    editInput.value?.focus();
  });
}

function cancelEdit() {
  editingCell.value = null;
  editValue.value = null;
}

async function saveEdit() {
  if (!editingCell.value) return;
  
  const { id, field } = editingCell.value;
  const newValue = editValue.value;
  
  try {
    const { error } = await supabase
      .from('logs')
      .update({ [field]: newValue })
      .eq('id', id);
      
    if (error) throw error;
    
    // Update local state
    const log = logs.value.find(l => l.id === id);
    if (log) {
      // @ts-ignore
      log[field as keyof LogEntry] = newValue;
    }
    
    showToast('แก้ไขข้อมูลสำเร็จ', 'success');
    cancelEdit();
  } catch (error) {
    console.error(error);
    showToast('แก้ไขข้อมูลไม่สำเร็จ', 'error');
  }
}

onMounted(() => {
  checkUser();
  loadLogs();
});
</script>
