<template>
  <div class="bg-white border border-gray-200 rounded-lg overflow-hidden hover:shadow-xl transition-all duration-300 flex flex-col h-full">
    <!-- Image Section -->
    <div class="w-full aspect-[4/5] bg-gray-100 relative group overflow-hidden">
      <img 
        :src="item.image_url || 'https://via.placeholder.com/300'" 
        :class="{'grayscale': item.quantity <= 0}" 
        class="absolute inset-0 w-full h-full object-cover object-center transition-transform duration-500 group-hover:scale-110"
        :alt="item.name"
      >
      
      <!-- Upload Overlay on Hover -->
      <div v-if="isLoggedIn" class="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center z-20">
        <button 
          @click="$refs.fileInput.click()" 
          class="bg-white text-black px-4 py-2 rounded-full font-bold text-sm shadow-lg hover:scale-105 transition"
        >
          <i class="fa-solid fa-camera"></i> เปลี่ยนรูป
        </button>
        <input 
          ref="fileInput" 
          type="file" 
          class="hidden" 
          accept="image/*" 
          @change="handleFileChange"
        >
      </div>

      <div v-if="item.quantity <= 0" class="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm z-10 pointer-events-none">
        <span class="bg-red-600 text-white px-4 py-1 rounded-full text-sm font-bold shadow-lg">สินค้าหมด</span>
      </div>
    </div>
    
    <!-- Content Section -->
    <div class="p-4 flex flex-col flex-grow">
      <div class="mb-4 space-y-2">
        <!-- Name Field -->
        <div v-if="editingField === 'name'" class="flex items-center gap-1">
          <input 
            v-model="editValue" 
            ref="editInputRef"
            type="text" 
            class="flex-1 w-full border border-black rounded px-2 py-1 text-sm font-bold"
            @keyup.enter="saveEdit"
            @keyup.esc="cancelEdit"
          >
          <button @click="saveEdit" class="text-green-600 hover:bg-green-50 p-1 rounded"><i class="fa-solid fa-check"></i></button>
          <button @click="cancelEdit" class="text-red-500 hover:bg-red-50 p-1 rounded"><i class="fa-solid fa-xmark"></i></button>
        </div>
        <h3 v-else class="font-bold text-lg text-gray-800 leading-tight flex items-start justify-between group/edit">
          <span class="line-clamp-1" :title="item.name">{{ item.name }}</span>
          <button v-if="isLoggedIn" @click="startEdit('name')" class="text-gray-400 hover:text-black hover:scale-110 ml-2 transition">
            <i class="fa-solid fa-pen text-xs"></i>
          </button>
        </h3>

        <!-- Cost Field -->
        <div class="flex items-center gap-2">
          <div v-if="editingField === 'cost'" class="flex items-center gap-1">
            <input 
              v-model="editValue" 
              ref="editInputRef"
              type="number" 
              class="w-24 border border-black rounded px-2 py-0.5 text-xs font-bold"
              @keyup.enter="saveEdit"
              @keyup.esc="cancelEdit"
            >
            <button @click="saveEdit" class="text-green-600 hover:bg-green-50 p-1 rounded"><i class="fa-solid fa-check text-xs"></i></button>
            <button @click="cancelEdit" class="text-red-500 hover:bg-red-50 p-1 rounded"><i class="fa-solid fa-xmark text-xs"></i></button>
          </div>
          <div v-else class="flex items-center gap-2 group/edit">
            <span class="text-[10px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded font-bold border border-gray-200">
              ทุน: {{ item.cost_per_unit?.toLocaleString() || '-' }} บ.
            </span>
            <button v-if="isLoggedIn" @click="startEdit('cost')" class="text-gray-400 hover:text-black hover:scale-110 -ml-1 transition">
              <i class="fa-solid fa-pen text-[9px]"></i>
            </button>
          </div>
        </div>

        <!-- Description Field -->
        <div v-if="editingField === 'description'" class="flex items-start gap-1">
          <textarea 
            v-model="editValue" 
            ref="editInputRef"
            rows="2"
            class="flex-1 w-full border border-black rounded px-2 py-1 text-xs"
            @keyup.enter.ctrl="saveEdit"
            @keyup.esc="cancelEdit"
          ></textarea>
          <div class="flex flex-col gap-1">
            <button @click="saveEdit" class="text-green-600 hover:bg-green-50 p-1 rounded"><i class="fa-solid fa-check text-xs"></i></button>
            <button @click="cancelEdit" class="text-red-500 hover:bg-red-50 p-1 rounded"><i class="fa-solid fa-xmark text-xs"></i></button>
          </div>
        </div>
        <div v-else class="relative group/edit">
          <p class="text-gray-500 text-xs line-clamp-2 h-8 overflow-hidden pr-4">
            {{ item.description || '-' }}
          </p>
          <button v-if="isLoggedIn" @click="startEdit('description')" class="absolute top-0 right-0 text-gray-400 hover:text-black hover:scale-110 transition">
            <i class="fa-solid fa-pen text-[9px]"></i>
          </button>
        </div>
      </div>
      
      <!-- Stats Section -->
      <div class="mt-auto">
        <div class="grid grid-cols-3 gap-1">
          <div class="bg-blue-50 border border-blue-100 rounded p-1.5 text-center">
            <div class="text-[9px] text-blue-500 font-bold uppercase">รับเข้า</div>
            <div class="text-sm font-extrabold text-blue-700">{{ item.total_quantity }}</div>
          </div>
          <div class="bg-red-50 border border-red-100 rounded p-1.5 text-center">
            <div class="text-[9px] text-red-500 font-bold uppercase">ใช้ไป</div>
            <div class="text-sm font-extrabold text-red-700">{{ item.total_quantity - item.quantity }}</div>
          </div>
          <div class="bg-green-50 border border-green-100 rounded p-1.5 text-center">
            <div class="text-[9px] text-green-600 font-bold uppercase">คงเหลือ</div>
            <div class="text-sm font-extrabold text-green-700">{{ item.quantity }}</div>
          </div>
        </div>
        
        <!-- Action Buttons (Admin Only) -->
        <template v-if="isLoggedIn">
          <div class="flex gap-1 mt-3 pt-3 border-t border-gray-100">
            <button 
              @click="$emit('restock', item)" 
              class="flex-1 py-1.5 bg-gray-100 hover:bg-gray-200 rounded text-xs font-bold flex items-center justify-center gap-1 transition"
            >
              <i class="fa-solid fa-plus text-green-600"></i> เติม
            </button>
            <button 
              @click="$emit('withdraw', item)" 
              class="flex-1 py-1.5 bg-black hover:bg-gray-800 text-white rounded text-xs font-bold flex items-center justify-center gap-1 transition"
            >
              <i class="fa-solid fa-minus"></i> เบิก
            </button>
          </div>
          <div class="flex gap-1 mt-1">
            <button 
              @click="$emit('delete', item)" 
              class="w-full text-red-500 text-[10px] border border-red-500 rounded py-1 flex items-center justify-center gap-1 hover:bg-red-50 transition"
            >
              <i class="fa-solid fa-trash"></i> ลบสินค้า
            </button>
          </div>
        </template>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, nextTick } from 'vue';
import type { StockItem } from './types';

const props = defineProps<{
  item: StockItem;
  isLoggedIn: boolean;
}>();

const emit = defineEmits(['restock', 'withdraw', 'edit', 'delete', 'update-inline', 'update-image']);

const editingField = ref<string | null>(null);
const editValue = ref<string | number>('');
const editInputRef = ref<HTMLInputElement | HTMLTextAreaElement | null>(null);

function startEdit(field: 'name' | 'cost' | 'description') {
  editingField.value = field;
  if (field === 'cost') {
    editValue.value = props.item.cost_per_unit || 0;
  } else if (field === 'description') {
    editValue.value = props.item.description || '';
  } else {
    editValue.value = props.item.name;
  }
  
  nextTick(() => {
    editInputRef.value?.focus();
  });
}

function cancelEdit() {
  editingField.value = null;
  editValue.value = '';
}

function saveEdit() {
  if (editingField.value === 'name' && !editValue.value) return;
  
  const updates: Partial<StockItem> = {};
  
  if (editingField.value === 'name') updates.name = editValue.value as string;
  if (editingField.value === 'description') updates.description = editValue.value as string;
  if (editingField.value === 'cost') updates.cost_per_unit = Number(editValue.value);
  
  emit('update-inline', props.item, updates);
  cancelEdit();
}

function handleFileChange(event: Event) {
  const target = event.target as HTMLInputElement;
  const file = target.files?.[0];
  if (file) {
    emit('update-image', props.item, file);
  }
}
</script>
