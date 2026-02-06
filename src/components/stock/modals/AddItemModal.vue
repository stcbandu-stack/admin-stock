<template>
  <Modal v-model="isOpen" title="เพิ่มของใหม่">
    <div class="space-y-3">
      <input 
        type="text" 
        v-model="form.name" 
        placeholder="ชื่อของชำร่วย" 
        class="w-full border p-2 rounded focus:border-red-600 outline-none dark:bg-gray-700 dark:border-gray-600 dark:text-white"
      >
      <input 
        type="text" 
        v-model="form.desc" 
        placeholder="คำอธิบาย" 
        class="w-full border p-2 rounded focus:border-red-600 outline-none dark:bg-gray-700 dark:border-gray-600 dark:text-white"
      >
      <input 
        type="number" 
        v-model="form.qty" 
        placeholder="จำนวนเริ่มต้น" 
        class="w-full border p-2 rounded focus:border-red-600 outline-none dark:bg-gray-700 dark:border-gray-600 dark:text-white"
      >
      <input 
        type="number" 
        v-model="form.cost" 
        placeholder="ต้นทุนต่อชิ้น (บาท)" 
        class="w-full border p-2 rounded focus:border-red-600 outline-none dark:bg-gray-700 dark:border-gray-600 dark:text-white"
      >
      <div class="text-sm dark:text-gray-300">
        รูปภาพ: 
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
          class="bg-black text-white px-4 py-2 rounded flex items-center gap-2 dark:bg-red-600 dark:hover:bg-red-700"
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
import type { AddItemForm } from '../types';

const props = defineProps<{
  modelValue: boolean;
  isProcessing: boolean;
}>();

const emit = defineEmits(['update:modelValue', 'submit']);

const isOpen = ref(props.modelValue);

watch(() => props.modelValue, (val) => {
  isOpen.value = val;
});

watch(isOpen, (val) => {
  emit('update:modelValue', val);
});

const form = reactive<AddItemForm>({
  name: '',
  desc: '',
  qty: '',
  cost: '',
  file: null
});

function handleFileChange(e: Event) {
  const target = e.target as HTMLInputElement;
  form.file = target.files?.[0] || null;
}

function close() {
  isOpen.value = false;
  resetForm();
}

function resetForm() {
  form.name = '';
  form.desc = '';
  form.qty = '';
  form.cost = '';
  form.file = null;
}

function submit() {
  emit('submit', { ...form });
}

defineExpose({ resetForm });
</script>
