<template>
  <Teleport to="body">
    <Transition name="modal">
      <div 
        v-if="modelValue" 
        class="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
        @click.self="close"
      >
        <div 
          :class="['bg-white rounded-lg shadow-2xl', sizeClass, borderClass]"
          @click.stop
        >
          <!-- Header -->
          <div v-if="title || $slots.header" class="p-6 pb-0">
            <slot name="header">
              <h2 :class="['text-xl font-bold', titleClass]">{{ title }}</h2>
            </slot>
          </div>
          
          <!-- Content -->
          <div class="p-6">
            <slot />
          </div>
          
          <!-- Footer -->
          <div v-if="$slots.footer" class="p-6 pt-0">
            <slot name="footer" />
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { computed } from 'vue';

interface Props {
  modelValue: boolean;
  title?: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'warning' | 'danger';
}

const props = withDefaults(defineProps<Props>(), {
  size: 'md',
  variant: 'default'
});

const emit = defineEmits(['update:modelValue', 'close']);

function close() {
  emit('update:modelValue', false);
  emit('close');
}

const sizeClass = computed(() => {
  switch (props.size) {
    case 'sm': return 'w-80';
    case 'lg': return 'w-[500px] max-h-[90vh] overflow-y-auto';
    default: return 'w-96';
  }
});

const borderClass = computed(() => {
  switch (props.variant) {
    case 'warning': return 'border-t-4 border-yellow-500';
    case 'danger': return 'border-t-4 border-red-500';
    default: return '';
  }
});

const titleClass = computed(() => {
  switch (props.variant) {
    case 'warning': return 'text-yellow-600';
    case 'danger': return 'text-red-600';
    default: return '';
  }
});

defineExpose({ close });
</script>

<style scoped>
.modal-enter-active,
.modal-leave-active {
  transition: all 0.2s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-from > div,
.modal-leave-to > div {
  transform: scale(0.95);
}
</style>
