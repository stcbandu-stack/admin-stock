<template>
  <tr class="hover:bg-gray-50 transition">
    <td class="p-3">
      <div class="flex items-center gap-3">
        <!-- Image with Upload -->
        <div class="relative group w-10 h-10 flex-shrink-0">
          <img 
            :src="item.image_url || 'https://via.placeholder.com/100'" 
            class="w-full h-full object-cover rounded-md border bg-gray-100"
            :alt="item.name"
          >
          <div v-if="isLoggedIn && editMode" class="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 rounded-md flex items-center justify-center transition cursor-pointer" @click="$refs.fileInput.click()">
            <i class="fa-solid fa-camera text-white text-xs"></i>
          </div>
          <input 
            ref="fileInput" 
            type="file" 
            class="hidden" 
            accept="image/*" 
            @change="handleFileChange"
          >
        </div>

        <div class="flex-1 min-w-0">
          <!-- Name Edit -->
          <div v-if="editingField === 'name'" class="flex items-center gap-1 mb-1">
            <input 
              v-model="editValue" 
              ref="editInputRef"
              type="text" 
              class="w-full border border-black rounded px-2 py-0.5 text-sm"
              @keyup.enter="saveEdit"
              @keyup.esc="cancelEdit"
            >
            <button @click="saveEdit" class="text-green-600 hover:bg-green-50 p-1"><i class="fa-solid fa-check text-xs"></i></button>
            <button @click="cancelEdit" class="text-red-500 hover:bg-red-50 p-1"><i class="fa-solid fa-xmark text-xs"></i></button>
          </div>
          <div v-else class="flex items-center gap-2 group/edit">
            <div class="font-bold text-gray-800 text-sm truncate" :title="item.name">{{ item.name }}</div>
            <button v-if="isLoggedIn && editMode" @click="startEdit('name')" class="text-gray-400 hover:text-black hover:scale-110 transition">
              <i class="fa-solid fa-pen text-[10px]"></i>
            </button>
          </div>

          <!-- Desc Edit -->
          <div v-if="editingField === 'description'" class="flex items-center gap-1">
            <input 
              v-model="editValue" 
              ref="editInputRef"
              type="text" 
              class="w-full border border-black rounded px-2 py-0.5 text-xs"
              @keyup.enter="saveEdit"
              @keyup.esc="cancelEdit"
            >
            <button @click="saveEdit" class="text-green-600 hover:bg-green-50 p-1"><i class="fa-solid fa-check text-[10px]"></i></button>
            <button @click="cancelEdit" class="text-red-500 hover:bg-red-50 p-1"><i class="fa-solid fa-xmark text-[10px]"></i></button>
          </div>
          <div v-else class="flex items-center gap-2 group/edit">
            <div class="text-xs text-gray-500 truncate max-w-[150px]">{{ item.description || '-' }}</div>
            <button v-if="isLoggedIn && editMode" @click="startEdit('description')" class="text-gray-400 hover:text-black hover:scale-110 transition">
              <i class="fa-solid fa-pen text-[9px]"></i>
            </button>
          </div>
        </div>
      </div>
    </td>
    
    <!-- Cost Edit -->
    <td class="p-3 text-right">
      <div v-if="editingField === 'cost'" class="flex items-center justify-end gap-1">
        <input 
          v-model="editValue" 
          ref="editInputRef"
          type="number" 
          class="w-20 border border-black rounded px-1 py-0.5 text-xs text-right"
          @keyup.enter="saveEdit"
          @keyup.esc="cancelEdit"
        >
        <button @click="saveEdit" class="text-green-600 hover:bg-green-50 p-1"><i class="fa-solid fa-check text-xs"></i></button>
        <button @click="cancelEdit" class="text-red-500 hover:bg-red-50 p-1"><i class="fa-solid fa-xmark text-xs"></i></button>
      </div>
      <div v-else class="flex items-center justify-end gap-2 group/edit">
        <span class="font-mono text-gray-600">{{ item.cost_per_unit?.toLocaleString() || '-' }}</span>
        <button v-if="isLoggedIn && editMode" @click="startEdit('cost')" class="text-gray-400 hover:text-black hover:scale-110 transition">
          <i class="fa-solid fa-pen text-[10px]"></i>
        </button>
      </div>
    </td>

    <td class="p-3 text-center font-bold text-blue-600 bg-blue-50/50">
      {{ item.total_quantity }}
    </td>
    <td class="p-3 text-center font-bold text-red-600 bg-red-50/50">
      {{ item.total_quantity - item.quantity }}
    </td>
    <td class="p-3 text-center font-bold text-green-600 bg-green-50/50 text-base">
      {{ item.quantity }}
    </td>
    <td v-if="isLoggedIn" class="p-3 text-center">
      <div class="flex gap-1 justify-center">
        <button 
          @click="$emit('withdraw', item)" 
          class="w-7 h-7 bg-black text-white rounded hover:bg-gray-800 flex items-center justify-center transition" 
          title="เบิก"
        >
          <i class="fa-solid fa-minus text-xs"></i>
        </button>
        <button 
          @click="$emit('restock', item)" 
          class="w-7 h-7 bg-gray-200 text-black rounded hover:bg-gray-300 flex items-center justify-center transition" 
          title="เติม"
        >
          <i class="fa-solid fa-plus text-xs"></i>
        </button>
        <button 
          @click="$emit('delete', item)" 
          class="w-7 h-7 text-red-600 border border-red-600 rounded hover:bg-red-50 flex items-center justify-center transition" 
          title="ลบ"
        >
          <i class="fa-solid fa-trash text-xs"></i>
        </button>
      </div>
    </td>
  </tr>
</template>

<script setup lang="ts">
import { ref, nextTick } from 'vue';
import type { StockItem } from './types';

const props = defineProps<{
  item: StockItem;
  isLoggedIn: boolean;
  editMode: boolean;
}>();

const emit = defineEmits(['restock', 'withdraw', 'edit', 'delete', 'update-inline', 'update-image']);

const editingField = ref<string | null>(null);
const editValue = ref<string | number>('');
const editInputRef = ref<HTMLInputElement | null>(null);

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
