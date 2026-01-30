<template>
  <p :class="cn('text-sm text-gray-500', $attrs.class)">
    <slot />
  </p>
</template>

<script setup lang="ts">
import { cn } from '@/lib/utils';
</script>
