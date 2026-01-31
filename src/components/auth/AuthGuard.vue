<template>
  <div v-if="loading" class="min-h-[80vh] flex items-center justify-center">
    <div class="text-center">
      <i class="fa-solid fa-circle-notch fa-spin text-4xl text-gray-400 mb-4"></i>
      <p class="text-gray-500 font-medium">กำลังตรวจสอบผู้ใช้งาน...</p>
    </div>
  </div>
  
  <div v-else-if="!session" class="min-h-[80vh] flex items-center justify-center py-10">
    <div class="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden transform transition-all scale-100 border border-gray-100">
      <div class="p-8">
        <div class="text-center mb-8">
          <img src="/STC-LOGO-RGB.svg" alt="Choice Logo" class="h-16 mx-auto mb-6" />
          <h2 class="text-2xl font-bold text-gray-800 mb-2">เข้าสู่ระบบ</h2>
           <p class="text-gray-500 text-sm leading-relaxed">
            ระบบจัดการของชำร่วย อีซูซุสงวนไทย สำหรับเจ้าหน้าที่เท่านั้น <br />
            กรุณาเข้าสู่ระบบก่อนใช้งาน <br />
            หากท่านไม่สามารถเข้าสู่ระบบได้ โปรดติดต่อแอดมิน
          </p>
        </div>

        <form @submit.prevent="handleLogin" class="space-y-5">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
            <div class="relative">
              <span class="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-500">
                <i class="fa-solid fa-envelope"></i>
              </span>
              <input 
                v-model="email" 
                type="email" 
                required
                class="w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-black outline-none transition text-sm"
                placeholder="admin@example.com"
              >
            </div>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1.5">Password</label>
            <div class="relative">
              <span class="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-500">
                <i class="fa-solid fa-lock"></i>
              </span>
              <input 
                v-model="password" 
                :type="showPassword ? 'text' : 'password'" 
                required
                class="w-full pl-10 pr-10 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-black outline-none transition text-sm"
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

          <div v-if="error" class="p-3 bg-red-50 text-red-600 text-sm rounded-lg flex items-start gap-2 border border-red-100">
            <i class="fa-solid fa-circle-exclamation mt-0.5"></i>
            <span>{{ error }}</span>
          </div>

          <button 
            type="submit" 
            :disabled="loginLoading"
            class="w-full bg-black text-white py-2.5 rounded-lg font-medium hover:bg-gray-800 focus:ring-4 focus:ring-gray-300 transition disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2 shadow-lg shadow-gray-200"
          >
            <i v-if="loginLoading" class="fa-solid fa-circle-notch fa-spin"></i>
            <span>{{ loginLoading ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบ' }}</span>
          </button>

          <div class="relative flex py-2 items-center">
            <div class="flex-grow border-t border-gray-200"></div>
            <span class="flex-shrink-0 mx-4 text-gray-400 text-xs uppercase tracking-wider">หรือ</span>
            <div class="flex-grow border-t border-gray-200"></div>
          </div>

          <button 
            type="button" 
            @click="handleGoogleLogin"
            :disabled="loginLoading"
            class="w-full bg-white text-gray-700 border border-gray-300 py-2.5 rounded-lg font-medium hover:bg-gray-50 focus:ring-4 focus:ring-gray-100 transition disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2"
          >
            <img src="/google-logo.svg" alt="Google" class="w-5 h-5" />
            <span>เข้าสู่ระบบด้วย Google</span>
          </button>
        </form>
      </div>
      <div class="bg-gray-50 px-8 py-4 border-t border-gray-100 text-center">
        <p class="text-xs text-gray-400">© 2024 Isuzu Sanguanthai. All rights reserved.</p>
      </div>
    </div>
  </div>
  
  <div v-else>
    <slot></slot>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import { supabase, type Session } from '@/lib/supabase';

const session = ref<Session | null>(null);
const loading = ref(true);
const loginLoading = ref(false);
const error = ref('');

const email = ref('');
const password = ref('');
const showPassword = ref(false);

async function checkSession() {
  try {
    const { data: { session: currentSession } } = await supabase.auth.getSession();
    session.value = currentSession;
  } catch (e) {
    console.error('Error checking session:', e);
  } finally {
    loading.value = false;
  }
}

async function handleLogin() {
  loginLoading.value = true;
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
    
    // Auth state change will be caught by the listener
  } catch (err: any) {
    console.error('Login error:', err);
    error.value = 'อีเมลหรือรหัสผ่านไม่ถูกต้อง';
  } finally {
    loginLoading.value = false;
  }
}

async function handleGoogleLogin() {
  loginLoading.value = true;
  error.value = '';
  
  try {
    const redirectUrl = window.location.origin + window.location.pathname;
    
    const { error: authError } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: redirectUrl
      }
    });

    if (authError) throw authError;
  } catch (err: any) {
    console.error('Google login error:', err);
    error.value = 'เกิดข้อผิดพลาดในการเข้าสู่ระบบด้วย Google';
    loginLoading.value = false;
  }
}

let authListener: { subscription: { unsubscribe: () => void } } | null = null;

onMounted(() => {
  checkSession();

  const { data } = supabase.auth.onAuthStateChange((_event, newSession) => {
    session.value = newSession;
    if (newSession) {
        loading.value = false;
    }
  });
  authListener = data;
});

onUnmounted(() => {
  if (authListener) authListener.subscription.unsubscribe();
});
</script>