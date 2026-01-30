<template>
  <span :class="badgeClasses">
    <slot />
  </span>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { cn } from '@/lib/utils';

interface Props {
  variant?: 'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'warning';
}

const props = withDefaults(defineProps<Props>(), {
  variant: 'default',
});

const baseClasses = 'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors';

const variantClasses = {
  default: 'border-transparent bg-gray-900 text-white',
  secondary: 'border-transparent bg-gray-100 text-gray-900',
  destructive: 'border-transparent bg-red-500 text-white',
  outline: 'border-gray-200 text-gray-900',
  success: 'border-transparent bg-green-500 text-white',
  warning: 'border-transparent bg-amber-500 text-white',
};

const badgeClasses = computed(() => cn(baseClasses, variantClasses[props.variant]));
</script>
