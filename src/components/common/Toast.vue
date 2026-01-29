<template>
  <Teleport to="body">
    <div class="fixed inset-0 flex flex-col items-center justify-center z-[100] pointer-events-none gap-4">
      <TransitionGroup name="toast">
        <div 
          v-for="toast in toasts" 
          :key="toast.id" 
          :class="[toast.bgClass, 'text-white px-10 py-6 rounded-2xl shadow-2xl flex flex-col items-center gap-4 transform transition-all duration-300 pointer-events-auto min-w-[300px] border-4 border-white/20']"
        >
          <i :class="['fa-solid text-6xl', toast.icon]"></i>
          <span class="text-2xl font-bold text-center">{{ toast.message }}</span>
        </div>
      </TransitionGroup>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';

interface Toast {
  id: number;
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
  bgClass: string;
  icon: string;
}

const toasts = ref<Toast[]>([]);

const colors: Record<string, string> = {
  success: 'bg-green-600',
  error: 'bg-red-600',
  warning: 'bg-yellow-500',
  info: 'bg-blue-600'
};

const icons: Record<string, string> = {
  success: 'fa-circle-check',
  error: 'fa-circle-xmark',
  warning: 'fa-triangle-exclamation',
  info: 'fa-circle-info'
};

function showToast(message: string, type: 'success' | 'error' | 'warning' | 'info' = 'success') {
  const id = Date.now();
  toasts.value.push({
    id,
    message,
    type,
    bgClass: colors[type],
    icon: icons[type]
  });
  
  setTimeout(() => {
    toasts.value = toasts.value.filter(t => t.id !== id);
  }, 3000);
}

// Listen to custom toast events
function handleToastEvent(e: CustomEvent) {
  showToast(e.detail.message, e.detail.type);
}

onMounted(() => {
  window.addEventListener('show-toast', handleToastEvent as EventListener);
});

onUnmounted(() => {
  window.removeEventListener('show-toast', handleToastEvent as EventListener);
});

// Expose for direct usage
defineExpose({ showToast });
</script>

<style scoped>
.toast-enter-active,
.toast-leave-active {
  transition: all 0.3s ease;
}

.toast-enter-from,
.toast-leave-to {
  opacity: 0;
  transform: scale(0.8) translateY(-20px);
}
</style>
