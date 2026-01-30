<template>
  <div :class="cn('rounded-xl border bg-white text-gray-950 shadow-sm', $attrs.class)">
    <slot />
  </div>
</template>

<script setup lang="ts">
import { cn } from '@/lib/utils';
</script>
