<template>
  <nav class="bg-white border-b border-gray-200 py-3 px-4 md:px-6 sticky top-0 z-20 shadow-sm flex flex-wrap justify-between items-center">
    <h1 class="text-lg md:text-2xl font-bold text-black truncate max-w-[50%]">
      ระบบ<span class="hidden md:inline">จัดการ</span><span class="text-red-600">ของชำร่วย</span>
    </h1>
    
    <div class="flex items-center gap-3 md:gap-6">
      <!-- Navigation Links -->
      <a 
        href="/" 
        :class="['text-sm md:text-base font-bold transition', isActive('/') ? 'text-black border-b-2 border-black' : 'text-gray-500 hover:text-red-600']"
      >
        <i class="fa-solid fa-house md:hidden"></i> 
        <span class="hidden md:inline">หน้าหลัก</span>
      </a>
      <a 
        href="/history" 
        :class="['text-sm md:text-base font-bold transition', isActive('/history') ? 'text-black border-b-2 border-black' : 'text-gray-500 hover:text-red-600']"
      >
        <span class="md:hidden">ประวัติ</span> 
        <span class="hidden md:inline">ประวัติการทำรายการ</span>
      </a>
      <a 
        href="/summary" 
        :class="['text-sm md:text-base font-bold transition', isActive('/summary') ? 'text-black border-b-2 border-black' : 'text-gray-500 hover:text-red-600']"
      >
        <span class="md:hidden">สรุป</span> 
        <span class="hidden md:inline">สรุปข้อมูล</span>
      </a>

      <!-- Auth Section -->
      <div v-if="currentUser">
        <button @click="logout" class="text-red-600 font-bold flex items-center gap-1 text-sm md:text-base hover:text-red-700 transition">
          <i class="fa-solid fa-right-from-bracket"></i> 
          <span class="hidden sm:inline">ออกจากระบบ</span>
        </button>
      </div>
      <div v-else>
        <button @click="openLoginModal" class="bg-black text-white px-4 py-1.5 rounded-full text-sm flex items-center gap-1 hover:bg-gray-800 transition">
          <i class="fa-solid fa-user-lock"></i> 
          <span class="hidden sm:inline">Staff Login</span>
        </button>
      </div>
    </div>
  </nav>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import { supabase, type User } from '@/lib/supabase';

defineEmits(['openLogin']);

const props = defineProps<{
  currentPath?: string;
}>();

const currentUser = ref<User | null>(null);

// Check if current path matches
function isActive(path: string): boolean {
  if (typeof window === 'undefined') return false;
  const currentPath = props.currentPath || window.location.pathname;
  if (path === '/') {
    return currentPath === '/' || currentPath === '/index.html';
  }
  return currentPath.startsWith(path);
}

// Auth functions
async function checkUser() {
  const { data: { session } } = await supabase.auth.getSession();
  currentUser.value = session?.user || null;
}

async function logout() {
  await supabase.auth.signOut();
  currentUser.value = null;
  window.dispatchEvent(new CustomEvent('auth-change', { detail: { user: null } }));
}

function openLoginModal() {
  window.dispatchEvent(new Event('open-login-modal'));
}

// Listen to auth changes
let authSubscription: { data: { subscription: { unsubscribe: () => void } } } | null = null;

onMounted(async () => {
  await checkUser();
  
  authSubscription = supabase.auth.onAuthStateChange((event, session) => {
    currentUser.value = session?.user || null;
    window.dispatchEvent(new CustomEvent('auth-change', { detail: { user: session?.user || null } }));
  });
});

onUnmounted(() => {
  authSubscription?.data.subscription.unsubscribe();
});

// Expose currentUser for parent components
defineExpose({ currentUser });
</script>
