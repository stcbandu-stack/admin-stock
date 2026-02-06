<template>
  <div v-if="isOpen" :class="['fixed inset-0 z-50 flex items-center justify-center p-4 transition-all duration-300', isLoggedIn ? 'bg-black bg-opacity-50 backdrop-blur-sm' : 'bg-gray-900 bg-opacity-90 backdrop-blur-md']" @click.self="isLoggedIn ? close() : null">
    <div class="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden transform transition-all scale-100 dark:bg-gray-800">
      <div class="p-6">
        <div class="text-center mb-6">
          <img src="/STC-LOGO-RGB.svg" alt="Choice Logo" class="h-16 mx-auto mb-4" />
          <h2 class="text-2xl font-bold text-gray-800 dark:text-white">เข้าสู่ระบบ</h2>
           <p class="text-gray-500 text-sm mt-3 leading-relaxed dark:text-gray-400">
            ระบบจัดการของชำร่วย อีซูซุสงวนไทย สำหรับเจ้าหน้าที่เท่านั้น <br />
            กรุณาเข้าสู่ระบบก่อนใช้งาน <br />
            หากท่านไม่สามารถเข้าสู่ระบบได้ โปรดติดต่อแอดมิน
          </p>
        </div>

        <form @submit.prevent="handleLogin" class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1 dark:text-gray-300">Email</label>
            <div class="relative">
              <span class="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-500 dark:text-gray-400">
                <i class="fa-solid fa-envelope"></i>
              </span>
              <input 
                v-model="email" 
                type="email" 
                required
                class="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-black outline-none transition dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:focus:ring-white dark:focus:border-white"
                placeholder="admin@example.com"
              >
            </div>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1 dark:text-gray-300">Password</label>
            <div class="relative">
              <span class="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-500 dark:text-gray-400">
                <i class="fa-solid fa-lock"></i>
              </span>
              <input 
                v-model="password" 
                :type="showPassword ? 'text' : 'password'" 
                required
                class="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-black outline-none transition dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:focus:ring-white dark:focus:border-white"
                placeholder="••••••••"
              >
              <button 
                type="button" 
                @click="showPassword = !showPassword" 
                class="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-500 hover:text-black focus:outline-none dark:text-gray-400 dark:hover:text-white"
              >
                <i :class="showPassword ? 'fa-solid fa-eye-slash' : 'fa-solid fa-eye'"></i>
              </button>
            </div>
          </div>

          <div v-if="error" class="p-3 bg-red-50 text-red-600 text-sm rounded-lg flex items-start gap-2 dark:bg-red-900/20 dark:text-red-400">
            <i class="fa-solid fa-circle-exclamation mt-0.5"></i>
            <span>{{ error }}</span>
          </div>

          <button 
            type="submit" 
            :disabled="loading"
            class="w-full bg-black text-white py-2.5 rounded-lg font-medium hover:bg-gray-800 focus:ring-4 focus:ring-gray-300 transition disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2 dark:bg-white dark:text-black dark:hover:bg-gray-200 dark:focus:ring-gray-600"
          >
            <i v-if="loading" class="fa-solid fa-circle-notch fa-spin"></i>
            <span>{{ loading ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบ' }}</span>
          </button>

          <div class="relative flex py-2 items-center">
            <div class="flex-grow border-t border-gray-300 dark:border-gray-600"></div>
            <span class="flex-shrink-0 mx-4 text-gray-400 text-xs dark:text-gray-500">หรือ</span>
            <div class="flex-grow border-t border-gray-300 dark:border-gray-600"></div>
          </div>

          <button 
            type="button" 
            @click="handleGoogleLogin"
            :disabled="loading"
            class="w-full bg-white text-gray-700 border border-gray-300 py-2.5 rounded-lg font-medium hover:bg-gray-50 focus:ring-4 focus:ring-gray-100 transition disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2 dark:bg-gray-700 dark:text-white dark:border-gray-600 dark:hover:bg-gray-600 dark:focus:ring-gray-800"
          >
            <img src="/google-logo.svg" alt="Google" class="w-5 h-5" />
            <span>เข้าสู่ระบบด้วย Google</span>
          </button>
        </form>
      </div>
      <div v-if="isLoggedIn" class="bg-gray-50 px-6 py-4 border-t border-gray-100 flex justify-end dark:bg-gray-800/50 dark:border-gray-700">
        <button @click="close" class="text-gray-500 hover:text-gray-700 text-sm font-medium transition dark:text-gray-400 dark:hover:text-white">
          ยกเลิก
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import { supabase } from '@/lib/supabase';

const isOpen = ref(false); // Initial state, will be updated in onMounted
const isLoggedIn = ref(false);
const showPassword = ref(false);
const email = ref('');
const password = ref('');
const loading = ref(false);
const error = ref('');

function open() {
  isOpen.value = true;
  showPassword.value = false;
  error.value = '';
}

function close() {
  // Prevent closing if not logged in
  if (!isLoggedIn.value) return;
  
  isOpen.value = false;
  showPassword.value = false;
  error.value = '';
  password.value = '';
}

async function handleLogin() {
  loading.value = true;
  error.value = '';

  try {
    const { data, error: authError } = await supabase.auth.signInWithPassword({
      email: email.value,
      password: password.value,
    });

    if (authError) throw authError;

    // Login successful
    window.dispatchEvent(new CustomEvent('show-toast', { 
      detail: { message: 'เข้าสู่ระบบสำเร็จ', type: 'success' } 
    }));
    
    // Auth state change is handled by supabase subscription in other components
    // We rely on the subscription to close the modal
  } catch (err: any) {
    console.error('Login error:', err);
    error.value = 'อีเมลหรือรหัสผ่านไม่ถูกต้อง';
  } finally {
    loading.value = false;
  }
}

async function handleGoogleLogin() {
  loading.value = true;
  error.value = '';
  
  try {
    // Get current URL without query string to ensure it matches allowed redirect URLs
    const redirectUrl = window.location.origin + window.location.pathname;
    
    const { error: authError } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: redirectUrl
      }
    });

    if (authError) throw authError;
    
    // The browser will redirect to Google authentication
  } catch (err: any) {
    console.error('Google login error:', err);
    error.value = 'เกิดข้อผิดพลาดในการเข้าสู่ระบบด้วย Google';
    loading.value = false;
  }
}

// Global Event Listeners
function handleOpenLogin() {
  open();
}

let authListener: { subscription: { unsubscribe: () => void } } | null = null;

onMounted(async () => {
  window.addEventListener('open-login-modal', handleOpenLogin);

  // Check initial session
  const { data: { session } } = await supabase.auth.getSession();
  isLoggedIn.value = !!session;
  
  // Force open if not logged in
  if (!session) {
    isOpen.value = true;
  }

  // Subscribe to auth changes
  const { data } = supabase.auth.onAuthStateChange((event, session) => {
    isLoggedIn.value = !!session;
    if (!session) {
      isOpen.value = true;
    } else {
      isOpen.value = false;
    }
  });
  authListener = data;
});

onUnmounted(() => {
  window.removeEventListener('open-login-modal', handleOpenLogin);
  if (authListener) authListener.subscription.unsubscribe();
});
</script>
