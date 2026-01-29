<template>
  <Modal v-model="isOpen" :title="modalTitle" size="lg">
    <div class="space-y-4">
      <!-- Date -->
      <div>
        <label class="text-xs text-gray-500 font-bold">วันที่</label>
        <input 
          type="date" 
          v-model="form.date" 
          :readonly="form.type === 'WITHDRAW'" 
          :class="{'bg-gray-100 text-gray-500 cursor-not-allowed': form.type === 'WITHDRAW'}" 
          class="w-full border p-2 rounded text-sm focus:border-red-600 outline-none"
        >
      </div>
      
      <!-- Amount -->
      <div>
        <label class="text-xs text-gray-500 font-bold">จำนวน</label>
        <input 
          type="number" 
          v-model="form.amount" 
          placeholder="จำนวน" 
          class="w-full border p-2 rounded text-sm focus:border-red-600 outline-none"
          min="1"
        >
      </div>
      
      <!-- Withdraw-specific fields -->
      <template v-if="form.type === 'WITHDRAW'">
        <div class="space-y-3 border-t pt-3 mt-3">
          <input 
            type="text" 
            v-model="form.userName" 
            placeholder="ชื่อคนเบิก" 
            class="w-full border p-2 rounded text-sm focus:border-red-600 outline-none"
          >
          <div class="relative">
            <select 
              v-model="form.branch" 
              class="w-full border p-2 rounded text-sm bg-white focus:border-red-600 outline-none"
            >
              <option value="" disabled>-- เลือกสาขา --</option>
              <option value="บ้านดู่">บ้านดู่</option>
              <option value="พาน">พาน</option>
              <option value="แม่สาย">แม่สาย</option>
              <option value="แม่จัน">แม่จัน</option>
            </select>
          </div>
          <input 
            type="text" 
            v-model="form.actName" 
            placeholder="ชื่อกิจกรรม" 
            class="w-full border p-2 rounded text-sm focus:border-red-600 outline-none"
          >
          <input 
            type="text" 
            v-model="form.actLoc" 
            placeholder="สถานที่" 
            class="w-full border p-2 rounded text-sm focus:border-red-600 outline-none"
          >
          <div>
            <label class="text-xs text-gray-500 font-bold">วันที่จัดกิจกรรม</label>
            <input 
              type="date" 
              v-model="form.actDate" 
              class="w-full border p-2 rounded text-sm focus:border-red-600 outline-none"
            >
          </div>
        </div>
      </template>
      
      <!-- Note -->
      <div class="pt-2">
        <label class="text-xs text-gray-500 font-bold">หมายเหตุ</label>
        <input 
          type="text" 
          v-model="form.note" 
          placeholder="ระบุหมายเหตุ..." 
          class="w-full border p-2 rounded text-sm focus:border-red-600 outline-none"
        >
      </div>
    </div>
    
    <template #footer>
      <div class="flex justify-end gap-2">
        <button @click="close" class="text-gray-500 px-4 py-2">ยกเลิก</button>
        <button 
          @click="submit" 
          :disabled="isProcessing" 
          :class="{'opacity-50 cursor-not-allowed': isProcessing}" 
          class="bg-red-600 text-white px-6 py-2 rounded font-bold flex items-center gap-2"
        >
          <i v-if="isProcessing" class="fa-solid fa-spinner fa-spin"></i>
          <span>ยืนยัน</span>
        </button>
      </div>
    </template>
  </Modal>
</template>

<script setup lang="ts">
import { ref, reactive, watch, computed } from 'vue';
import Modal from '@/components/common/Modal.vue';
import type { ActionForm, StockItem } from '../types';

const props = defineProps<{
  modelValue: boolean;
  isProcessing: boolean;
  item: StockItem | null;
  actionType: 'RESTOCK' | 'WITHDRAW' | '';
}>();

const emit = defineEmits(['update:modelValue', 'submit']);

const isOpen = ref(props.modelValue);

watch(() => props.modelValue, (val) => {
  isOpen.value = val;
});

watch(isOpen, (val) => {
  emit('update:modelValue', val);
});

const modalTitle = computed(() => {
  const action = props.actionType === 'RESTOCK' ? 'เติมสต็อค' : 'เบิกของ';
  return `${action} - ${props.item?.name || ''}`;
});

const form = reactive<ActionForm>({
  itemId: null,
  itemName: '',
  type: '',
  amount: '',
  date: new Date().toISOString().split('T')[0],
  userName: '',
  branch: '',
  actName: '',
  actLoc: '',
  actDate: '',
  note: ''
});

// Update form when item/actionType changes
watch([() => props.item, () => props.actionType], ([item, type]) => {
  if (item && type) {
    form.itemId = item.id;
    form.itemName = item.name;
    form.type = type;
    form.date = new Date().toISOString().split('T')[0];
    form.amount = '';
    form.userName = '';
    form.branch = '';
    form.actName = '';
    form.actLoc = '';
    form.actDate = '';
    form.note = '';
  }
}, { immediate: true });

function close() {
  isOpen.value = false;
}

function submit() {
  emit('submit', { ...form });
}
</script>
