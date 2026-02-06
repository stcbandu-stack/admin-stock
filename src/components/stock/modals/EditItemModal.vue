<template>
  <Modal v-model="isOpen" title="แก้ไขข้อมูล" variant="warning">
    <div class="space-y-3">
      <input 
        type="text" 
        v-model="form.name" 
        placeholder="ชื่อสินค้า" 
        class="w-full border p-2 rounded focus:border-yellow-500 outline-none dark:bg-gray-700 dark:border-gray-600 dark:text-white"
      >
      <input 
        type="text" 
        v-model="form.desc" 
        placeholder="คำอธิบาย" 
        class="w-full border p-2 rounded focus:border-yellow-500 outline-none dark:bg-gray-700 dark:border-gray-600 dark:text-white"
      >
      <input 
        type="number" 
        v-model="form.cost" 
        placeholder="ต้นทุนต่อชิ้น (บาท)" 
        class="w-full border p-2 rounded focus:border-yellow-500 outline-none dark:bg-gray-700 dark:border-gray-600 dark:text-white"
      >
      <div class="text-sm dark:text-gray-300">
        เปลี่ยนรูป: 
        <input 
          type="file" 
          @change="handleFileChange" 
          accept="image/*"
          class="mt-1 file:bg-gray-700 file:border-none file:text-white file:px-3 file:py-1 file:rounded"
        >
      </div>
    </div>
    
    <template #footer>
      <div class="flex justify-end gap-2">
        <button @click="close" class="text-gray-500 px-4 py-2 dark:text-gray-400">ยกเลิก</button>
        <button 
          @click="submit" 
          :disabled="isProcessing" 
          :class="{'opacity-50 cursor-not-allowed': isProcessing}" 
          class="bg-yellow-500 text-white px-4 py-2 rounded flex items-center gap-2"
        >
          <i v-if="isProcessing" class="fa-solid fa-spinner fa-spin"></i>
          <span>บันทึก</span>
        </button>
      </div>
    </template>
  </Modal>
</template>

<script setup lang="ts">
import { ref, reactive, watch } from 'vue';
import Modal from '@/components/common/Modal.vue';
import type { EditItemForm, StockItem } from '../types';

const props = defineProps<{
  modelValue: boolean;
  isProcessing: boolean;
  item: StockItem | null;
}>();

const emit = defineEmits(['update:modelValue', 'submit']);

const isOpen = ref(props.modelValue);

watch(() => props.modelValue, (val) => {
  isOpen.value = val;
});

watch(isOpen, (val) => {
  emit('update:modelValue', val);
});

// Populate form when item changes
watch(() => props.item, (item) => {
  if (item) {
    form.id = item.id;
    form.name = item.name;
    form.desc = item.description || '';
    form.cost = item.cost_per_unit?.toString() || '';
  }
}, { immediate: true });

const form = reactive<EditItemForm>({
  id: null,
  name: '',
  desc: '',
  cost: '',
  file: null
});

function handleFileChange(e: Event) {
  const target = e.target as HTMLInputElement;
  form.file = target.files?.[0] || null;
}

function close() {
  isOpen.value = false;
}

function submit() {
  emit('submit', { ...form });
}
</script>
