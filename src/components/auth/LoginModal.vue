<template>
  <div v-if="isOpen" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50 backdrop-blur-sm" @click.self="close">
    <div class="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden transform transition-all scale-100">
      <div class="p-6">
        <div class="text-center mb-6">
          <h2 class="text-2xl font-bold text-gray-800">เข้าสู่ระบบ</h2>
          <p class="text-gray-500 text-sm mt-1">สำหรับเจ้าหน้าที่ดูแลระบบ</p>
        </div>

        <form @submit.prevent="handleLogin" class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <div class="relative">
              <span class="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-500">
                <i class="fa-solid fa-envelope"></i>
              </span>
              <input 
                v-model="email" 
                type="email" 
                required
                class="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-black outline-none transition"
                placeholder="admin@example.com"
              >
            </div>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <div class="relative">
              <span class="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-500">
                <i class="fa-solid fa-lock"></i>
              </span>
              <input 
                v-model="password" 
                :type="showPassword ? 'text' : 'password'" 
                required
                class="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-black outline-none transition"
                placeholder="••••••••"
              >
              <button 
                type="button" 
                @click="showPassword = !showPassword" 
                class="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-500 hover:text-black focus:outline-none"
              >
                <i :class="showPassword ? 'fa-solid fa-eye-slash' : 'fa-solid fa-eye'"></i>
              </button>
            </div>
          </div>

          <div v-if="error" class="p-3 bg-red-50 text-red-600 text-sm rounded-lg flex items-start gap-2">
            <i class="fa-solid fa-circle-exclamation mt-0.5"></i>
            <span>{{ error }}</span>
          </div>

          <button 
            type="submit" 
            :disabled="loading"
            class="w-full bg-black text-white py-2.5 rounded-lg font-medium hover:bg-gray-800 focus:ring-4 focus:ring-gray-300 transition disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2"
          >
            <i v-if="loading" class="fa-solid fa-circle-notch fa-spin"></i>
            <span>{{ loading ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบ' }}</span>
          </button>

          <div class="relative flex py-2 items-center">
            <div class="flex-grow border-t border-gray-300"></div>
            <span class="flex-shrink-0 mx-4 text-gray-400 text-xs">หรือ</span>
            <div class="flex-grow border-t border-gray-300"></div>
          </div>

          <button 
            type="button" 
            @click="handleGoogleLogin"
            :disabled="loading"
            class="w-full bg-white text-gray-700 border border-gray-300 py-2.5 rounded-lg font-medium hover:bg-gray-50 focus:ring-4 focus:ring-gray-100 transition disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2"
          >
            <img src="/google-logo.svg" alt="Google" class="w-5 h-5" />
            <span>เข้าสู่ระบบด้วย Google</span>
          </button>
        </form>
      </div>
      <div class="bg-gray-50 px-6 py-4 border-t border-gray-100 flex justify-end">
        <button @click="close" class="text-gray-500 hover:text-gray-700 text-sm font-medium transition">
          ยกเลิก
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import { supabase } from '@/lib/supabase';

const isOpen = ref(false);
const showPassword = ref(false);
const email = ref('');
const password = ref('');
const loading = ref(false);
const error = ref('');

function open() {
  isOpen.value = true;
  showPassword.value = false;
  error.value = '';
  // Don't reset email for convenience if they failed
}

function close() {
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
    close();
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

onMounted(() => {
  window.addEventListener('open-login-modal', handleOpenLogin);
});

onUnmounted(() => {
  window.removeEventListener('open-login-modal', handleOpenLogin);
});
</script>
