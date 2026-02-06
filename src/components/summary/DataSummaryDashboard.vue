<template>
  <div class="relative min-h-screen">
    <!-- Main Dashboard Content -->
    <div :class="{ 'blur-sm pointer-events-none select-none': !isLoggedIn }">
      <!-- Header & Filter -->
      <div class="mb-6">
        <Card class="dark:bg-gray-800 dark:border-gray-700">
          <CardHeader class="pb-4">
            <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <CardTitle class="text-xl dark:text-white">สรุปข้อมูลสต็อค</CardTitle>
                <CardDescription class="dark:text-gray-400">ภาพรวมของชำร่วยและการเบิกจ่าย</CardDescription>
              </div>
              <div class="flex flex-wrap items-center gap-3">
                <!-- Period Filter -->
                <div class="flex items-center gap-2 bg-gray-50 p-2 rounded-lg dark:bg-gray-700">
                  <Calendar class="h-4 w-4 text-gray-500 dark:text-gray-400" />
                  <Select v-model="selectedPeriod" class="w-36 border-0 bg-transparent dark:text-white dark:bg-gray-700">
                    <option value="this_week">สัปดาห์นี้</option>
                    <option value="last_week">สัปดาห์ที่แล้ว</option>
                    <option value="this_month">เดือนนี้</option>
                    <option value="last_month">เดือนที่แล้ว</option>
                    <option value="custom">กำหนดเอง</option>
                  </Select>
                </div>

                <!-- Custom Date Range -->
                <div v-if="selectedPeriod === 'custom'" class="flex items-center gap-2">
                  <input 
                    type="date" 
                    v-model="customStartDate"
                    class="h-10 px-3 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  />
                  <span class="text-gray-400">ถึง</span>
                  <input 
                    type="date" 
                    v-model="customEndDate"
                    class="h-10 px-3 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  />
                </div>

                <!-- Refresh Button -->
                <Button variant="outline" size="icon" @click="refreshData" :disabled="loading" class="dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700">
                  <RefreshCw :class="['h-4 w-4', { 'animate-spin': loading }]" />
                </Button>
              </div>
            </div>
          </CardHeader>
        </Card>
      </div>

      <!-- Section 1-4: Summary Cards -->
      <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
        <!-- 1. จำนวนของชำร่วยทั้งหมด (นับรายการ) -->
        <Card class="dark:bg-gray-800 dark:border-gray-700">
          <CardHeader class="pb-2">
            <CardTitle class="text-xs font-medium text-gray-500 dark:text-gray-400">จำนวนรายการ</CardTitle>
          </CardHeader>
          <CardContent>
            <div class="text-2xl font-bold text-gray-900 dark:text-white">{{ formatNumber(metrics.totalItems) }}</div>
            <p class="text-xs text-gray-400 dark:text-gray-500">รายการของชำร่วย</p>
          </CardContent>
        </Card>

        <!-- 2. จำนวนคงคลังทั้งหมด (นับชิ้น) -->
        <Card class="dark:bg-gray-800 dark:border-gray-700">
          <CardHeader class="pb-2">
            <CardTitle class="text-xs font-medium text-gray-500 dark:text-gray-400">คงคลังทั้งหมด</CardTitle>
          </CardHeader>
          <CardContent>
            <div class="text-2xl font-bold text-green-600 dark:text-green-500">{{ formatNumber(metrics.totalStock) }}</div>
            <p class="text-xs text-gray-400 dark:text-gray-500">ชิ้น</p>
          </CardContent>
        </Card>

        <!-- 3. มูลค่าคงคลัง -->
        <Card class="dark:bg-gray-800 dark:border-gray-700">
          <CardHeader class="pb-2">
            <CardTitle class="text-xs font-medium text-gray-500 dark:text-gray-400">มูลค่าคงคลัง</CardTitle>
          </CardHeader>
          <CardContent>
            <div class="text-xl font-bold text-amber-600 dark:text-amber-500">{{ formatCurrency(metrics.totalValue) }}</div>
            <p class="text-xs text-gray-400 dark:text-gray-500">บาท</p>
          </CardContent>
        </Card>

        <!-- 4a. มูลค่ารับเข้า -->
        <Card class="dark:bg-gray-800 dark:border-gray-700">
          <CardHeader class="pb-2">
            <CardTitle class="text-xs font-medium text-gray-500 dark:text-gray-400">มูลค่ารับเข้า</CardTitle>
          </CardHeader>
          <CardContent>
            <div class="text-xl font-bold text-blue-600 dark:text-blue-500">{{ formatCurrency(metrics.restockValue) }}</div>
            <p class="text-xs text-gray-400 dark:text-gray-500">{{ formatNumber(metrics.totalRestocked) }} ชิ้น</p>
          </CardContent>
        </Card>

        <!-- 4b. มูลค่าเบิกออก -->
        <Card class="dark:bg-gray-800 dark:border-gray-700">
          <CardHeader class="pb-2">
            <CardTitle class="text-xs font-medium text-gray-500 dark:text-gray-400">มูลค่าเบิกออก</CardTitle>
          </CardHeader>
          <CardContent>
            <div class="text-xl font-bold text-red-600 dark:text-red-500">{{ formatCurrency(metrics.withdrawValue) }}</div>
            <p class="text-xs text-gray-400 dark:text-gray-500">{{ formatNumber(metrics.totalWithdrawn) }} ชิ้น</p>
          </CardContent>
        </Card>

        <!-- Low Stock + Out of Stock Count -->
        <Card class="dark:bg-gray-800 dark:border-gray-700">
          <CardHeader class="pb-2">
            <CardTitle class="text-xs font-medium text-gray-500 dark:text-gray-400">ต้องเติมสต็อค</CardTitle>
          </CardHeader>
          <CardContent>
            <div class="flex items-baseline gap-2">
              <span class="text-xl font-bold text-orange-500">{{ metrics.lowStockItems }}</span>
              <span class="text-gray-400 dark:text-gray-500">/</span>
              <span class="text-xl font-bold text-red-600">{{ metrics.outOfStockItems }}</span>
            </div>
            <p class="text-xs text-gray-400 dark:text-gray-500">ใกล้หมด / หมดแล้ว</p>
          </CardContent>
        </Card>
      </div>

      <!-- Section 5: Low Stock & Out of Stock Tables -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <!-- ของใกล้หมด -->
        <Card class="dark:bg-gray-800 dark:border-gray-700">
          <CardHeader class="pb-3">
            <div class="flex items-center gap-2">
              <AlertTriangle class="h-5 w-5 text-orange-500" />
              <CardTitle class="text-base dark:text-white">ของใกล้หมด</CardTitle>
              <Badge variant="warning">{{ lowStockList.length }}</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div class="max-h-64 overflow-y-auto">
              <table class="w-full text-sm">
                <thead class="sticky top-0 bg-white dark:bg-gray-800">
                  <tr class="border-b border-gray-200 dark:border-gray-700">
                    <th class="text-left py-2 px-2 font-medium text-gray-600 dark:text-gray-300">สินค้า</th>
                    <th class="text-right py-2 px-2 font-medium text-gray-600 dark:text-gray-300">คงเหลือ</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="item in lowStockList" :key="item.id" class="border-b border-gray-50 hover:bg-orange-50 dark:border-gray-700 dark:hover:bg-orange-900/20">
                    <td class="py-2 px-2">
                      <div class="flex items-center gap-2">
                        <div class="w-8 h-8 rounded bg-gray-100 flex items-center justify-center overflow-hidden flex-shrink-0 dark:bg-gray-700">
                          <img v-if="item.image_url" :src="item.image_url" class="w-full h-full object-cover" />
                          <Package v-else class="h-4 w-4 text-gray-400" />
                        </div>
                        <span class="truncate dark:text-gray-200">{{ item.name }}</span>
                      </div>
                    </td>
                    <td class="py-2 px-2 text-right">
                      <span class="font-bold text-orange-600 dark:text-orange-500">{{ item.quantity }}</span>
                    </td>
                  </tr>
                  <tr v-if="lowStockList.length === 0">
                    <td colspan="2" class="py-6 text-center text-gray-400 dark:text-gray-500">
                      <CheckCircle2 class="h-8 w-8 mx-auto mb-2 text-green-500" />
                      <p class="text-sm">ไม่มีสินค้าใกล้หมด</p>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        <!-- ของหมดแล้ว -->
        <Card class="dark:bg-gray-800 dark:border-gray-700">
          <CardHeader class="pb-3">
            <div class="flex items-center gap-2">
              <XCircle class="h-5 w-5 text-red-500" />
              <CardTitle class="text-base dark:text-white">ของหมดแล้ว</CardTitle>
              <Badge variant="destructive">{{ outOfStockList.length }}</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div class="max-h-64 overflow-y-auto">
              <table class="w-full text-sm">
                <thead class="sticky top-0 bg-white dark:bg-gray-800">
                  <tr class="border-b border-gray-200 dark:border-gray-700">
                    <th class="text-left py-2 px-2 font-medium text-gray-600 dark:text-gray-300">สินค้า</th>
                    <th class="text-right py-2 px-2 font-medium text-gray-600 dark:text-gray-300">เคยมี</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="item in outOfStockList" :key="item.id" class="border-b border-gray-50 hover:bg-red-50 dark:border-gray-700 dark:hover:bg-red-900/20">
                    <td class="py-2 px-2">
                      <div class="flex items-center gap-2">
                        <div class="w-8 h-8 rounded bg-gray-100 flex items-center justify-center overflow-hidden flex-shrink-0 dark:bg-gray-700">
                          <img v-if="item.image_url" :src="item.image_url" class="w-full h-full object-cover" />
                          <Package v-else class="h-4 w-4 text-gray-400" />
                        </div>
                        <span class="truncate dark:text-gray-200">{{ item.name }}</span>
                      </div>
                    </td>
                    <td class="py-2 px-2 text-right">
                      <span class="text-gray-500 dark:text-gray-400">{{ item.total_quantity }}</span>
                    </td>
                  </tr>
                  <tr v-if="outOfStockList.length === 0">
                    <td colspan="2" class="py-6 text-center text-gray-400 dark:text-gray-500">
                      <CheckCircle2 class="h-8 w-8 mx-auto mb-2 text-green-500" />
                      <p class="text-sm">ไม่มีสินค้าหมด</p>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>

      <!-- Section 6: All Products Table with Branch Breakdown -->
      <Card class="dark:bg-gray-800 dark:border-gray-700">
        <CardHeader>
          <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <CardTitle class="dark:text-white">รายการของชำร่วยทั้งหมด</CardTitle>
              <CardDescription class="dark:text-gray-400">แสดงจำนวนเบิกแยกตามสาขา (ในช่วงเวลาที่เลือก)</CardDescription>
            </div>
            <!-- Search -->
            <div class="relative w-full md:w-64">
              <input 
                type="text" 
                v-model="searchTerm" 
                placeholder="ค้นหาสินค้า..." 
                class="w-full border border-gray-200 p-2 pl-9 rounded-lg text-sm focus:border-gray-400 outline-none dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              >
              <Search class="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div class="overflow-x-auto">
            <table class="w-full text-sm">
              <thead>
                <tr class="border-b-2 border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-900">
                  <th class="text-left py-3 px-3 font-semibold text-gray-700 w-12 dark:text-gray-300">รูป</th>
                  <th class="text-left py-3 px-3 font-semibold text-gray-700 min-w-[150px] dark:text-gray-300">
                    <button @click="sortBy('name')" class="flex items-center gap-1 hover:text-gray-900 dark:hover:text-white">
                      ชื่อสินค้า
                      <ArrowUpDown class="h-3 w-3" />
                    </button>
                  </th>
                  <th class="text-center py-3 px-3 font-semibold text-gray-700 bg-green-50 dark:bg-green-900/30 dark:text-green-400">
                    <button @click="sortBy('quantity')" class="flex items-center justify-center gap-1 hover:text-gray-900 dark:hover:text-white w-full">
                      คงเหลือ
                      <ArrowUpDown class="h-3 w-3" />
                    </button>
                  </th>
                  <th class="text-center py-3 px-3 font-semibold text-blue-700 bg-blue-50 dark:bg-blue-900/30 dark:text-blue-400 min-w-[80px]">บ้านดู่</th>
                  <th class="text-center py-3 px-3 font-semibold text-purple-700 bg-purple-50 dark:bg-purple-900/30 dark:text-purple-400 min-w-[80px]">พาน</th>
                  <th class="text-center py-3 px-3 font-semibold text-pink-700 bg-pink-50 dark:bg-pink-900/30 dark:text-pink-400 min-w-[80px]">แม่สาย</th>
                  <th class="text-center py-3 px-3 font-semibold text-orange-700 bg-orange-50 dark:bg-orange-900/30 dark:text-orange-400 min-w-[80px]">แม่จัน</th>
                  <th class="text-center py-3 px-3 font-semibold text-red-700 bg-red-50 dark:bg-red-900/30 dark:text-red-400 min-w-[80px]">รวมเบิก</th>
                </tr>
              </thead>
              <tbody>
                <tr 
                  v-for="item in paginatedItems" 
                  :key="item.id" 
                  class="border-b border-gray-100 hover:bg-gray-50 transition dark:border-gray-700 dark:hover:bg-gray-700/50"
                >
                  <td class="py-2 px-3">
                    <div class="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center overflow-hidden dark:bg-gray-700">
                      <img v-if="item.image_url" :src="item.image_url" :alt="item.name" class="w-full h-full object-cover" />
                      <Package v-else class="h-5 w-5 text-gray-400" />
                    </div>
                  </td>
                  <td class="py-2 px-3">
                    <p class="font-medium dark:text-white">{{ item.name }}</p>
                    <p v-if="item.description" class="text-xs text-gray-400 truncate max-w-[200px] dark:text-gray-500">{{ item.description }}</p>
                  </td>
                  <td class="py-2 px-3 text-center bg-green-50/50 dark:bg-green-900/20">
                    <span 
                      :class="[
                        'font-bold',
                        item.quantity === 0 ? 'text-red-600 dark:text-red-500' : item.quantity < 10 ? 'text-orange-600 dark:text-orange-500' : 'text-green-600 dark:text-green-500'
                      ]"
                    >
                      {{ formatNumber(item.quantity) }}
                    </span>
                  </td>
                  <td class="py-2 px-3 text-center bg-blue-50/30 dark:bg-blue-900/20">
                    <span :class="getBranchWithdrawAmount(item.id, 'บ้านดู่') > 0 ? 'font-semibold text-blue-700 dark:text-blue-400' : 'text-gray-300 dark:text-gray-600'">
                      {{ getBranchWithdrawAmount(item.id, 'บ้านดู่') || '-' }}
                    </span>
                  </td>
                  <td class="py-2 px-3 text-center bg-purple-50/30 dark:bg-purple-900/20">
                    <span :class="getBranchWithdrawAmount(item.id, 'พาน') > 0 ? 'font-semibold text-purple-700 dark:text-purple-400' : 'text-gray-300 dark:text-gray-600'">
                      {{ getBranchWithdrawAmount(item.id, 'พาน') || '-' }}
                    </span>
                  </td>
                  <td class="py-2 px-3 text-center bg-pink-50/30 dark:bg-pink-900/20">
                    <span :class="getBranchWithdrawAmount(item.id, 'แม่สาย') > 0 ? 'font-semibold text-pink-700 dark:text-pink-400' : 'text-gray-300 dark:text-gray-600'">
                      {{ getBranchWithdrawAmount(item.id, 'แม่สาย') || '-' }}
                    </span>
                  </td>
                  <td class="py-2 px-3 text-center bg-orange-50/30 dark:bg-orange-900/20">
                    <span :class="getBranchWithdrawAmount(item.id, 'แม่จัน') > 0 ? 'font-semibold text-orange-700 dark:text-orange-400' : 'text-gray-300 dark:text-gray-600'">
                      {{ getBranchWithdrawAmount(item.id, 'แม่จัน') || '-' }}
                    </span>
                  </td>
                  <td class="py-2 px-3 text-center bg-red-50/50 dark:bg-red-900/20">
                    <span class="font-bold text-red-600 dark:text-red-500">
                      {{ getTotalWithdrawForItem(item.id) || '-' }}
                    </span>
                  </td>
                </tr>
                <tr v-if="filteredItems.length === 0">
                  <td colspan="8" class="py-8 text-center text-gray-400 dark:text-gray-500">
                    <Package class="h-10 w-10 mx-auto mb-2 opacity-50" />
                    <p>ไม่พบรายการที่ค้นหา</p>
                  </td>
                </tr>
              </tbody>
              <!-- Summary Footer -->
              <tfoot class="bg-gray-100 font-semibold dark:bg-gray-900/50">
                <tr>
                  <td colspan="2" class="py-3 px-3 text-gray-700 dark:text-gray-300">รวมทั้งหมด</td>
                  <td class="py-3 px-3 text-center text-green-700 bg-green-100 dark:bg-green-900/50 dark:text-green-400">{{ formatNumber(metrics.totalStock) }}</td>
                  <td class="py-3 px-3 text-center text-blue-700 bg-blue-100 dark:bg-blue-900/50 dark:text-blue-400">{{ formatNumber(branchTotals['บ้านดู่'] || 0) }}</td>
                  <td class="py-3 px-3 text-center text-purple-700 bg-purple-100 dark:bg-purple-900/50 dark:text-purple-400">{{ formatNumber(branchTotals['พาน'] || 0) }}</td>
                  <td class="py-3 px-3 text-center text-pink-700 bg-pink-100 dark:bg-pink-900/50 dark:text-pink-400">{{ formatNumber(branchTotals['แม่สาย'] || 0) }}</td>
                  <td class="py-3 px-3 text-center text-orange-700 bg-orange-100 dark:bg-orange-900/50 dark:text-orange-400">{{ formatNumber(branchTotals['แม่จัน'] || 0) }}</td>
                  <td class="py-3 px-3 text-center text-red-700 bg-red-100 dark:bg-red-900/50 dark:text-red-400">{{ formatNumber(metrics.totalWithdrawn) }}</td>
                </tr>
              </tfoot>
            </table>
          </div>

          <!-- Pagination -->
          <div v-if="totalPages > 1" class="flex items-center justify-between mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
            <p class="text-sm text-gray-500 dark:text-gray-400">
              แสดง {{ (currentPage - 1) * itemsPerPage + 1 }} - {{ Math.min(currentPage * itemsPerPage, filteredItems.length) }} 
              จาก {{ filteredItems.length }} รายการ
            </p>
            <div class="flex items-center gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                :disabled="currentPage === 1"
                @click="currentPage--"
                class="dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
              >
                <ChevronLeft class="h-4 w-4" />
              </Button>
              <span class="text-sm text-gray-600 dark:text-gray-400">หน้า {{ currentPage }} / {{ totalPages }}</span>
              <Button 
                variant="outline" 
                size="sm" 
                :disabled="currentPage === totalPages"
                @click="currentPage++"
                class="dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
              >
                <ChevronRight class="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue';
import { supabase, type User } from '@/lib/supabase';
import { formatNumber, formatCurrency } from '@/lib/utils';
import { 
  Card, CardHeader, CardTitle, CardDescription, CardContent, 
  Button, Select, Badge 
} from '@/components/ui';
import { 
  Package, AlertTriangle, XCircle, Calendar, RefreshCw, CheckCircle2,
  Search, ArrowUpDown, ChevronLeft, ChevronRight
} from 'lucide-vue-next';
import type { StockItem, LogEntry } from '@/components/stock/types';

// Fixed branch names
const BRANCHES = ['บ้านดู่', 'พาน', 'แม่สาย', 'แม่จัน'] as const;

// State
const isLoggedIn = ref(false);
const currentUser = ref<User | null>(null);
const loading = ref(false);

// Filter state
const selectedPeriod = ref('this_month');
const customStartDate = ref('');
const customEndDate = ref('');

// Data state
const stockItems = ref<StockItem[]>([]);
const logEntries = ref<LogEntry[]>([]);

// Table state
const searchTerm = ref('');
const sortField = ref<'name' | 'quantity'>('name');
const sortDirection = ref<'asc' | 'desc'>('asc');
const currentPage = ref(1);
const itemsPerPage = 20;

// Computed: Branch withdrawal data
const branchWithdrawData = computed(() => {
  const filteredLogs = getFilteredLogs();
  const data: Record<number, Record<string, number>> = {};
  
  filteredLogs
    .filter(log => log.action_type === 'WITHDRAW')
    .forEach(log => {
      const itemId = log.item_id;
      const branch = log.branch || 'ไม่ระบุ';
      
      if (!data[itemId]) {
        data[itemId] = {};
      }
      data[itemId][branch] = (data[itemId][branch] || 0) + log.amount;
    });
  
  return data;
});

// Computed: Branch totals
const branchTotals = computed(() => {
  const totals: Record<string, number> = {};
  const filteredLogs = getFilteredLogs();
  
  filteredLogs
    .filter(log => log.action_type === 'WITHDRAW')
    .forEach(log => {
      const branch = log.branch || 'ไม่ระบุ';
      totals[branch] = (totals[branch] || 0) + log.amount;
    });
  
  return totals;
});

// Computed: Get cost per unit for an item
const itemCostMap = computed(() => {
  const map: Record<number, number> = {};
  stockItems.value.forEach(item => {
    map[item.id] = item.cost_per_unit || 0;
  });
  return map;
});

// Computed metrics
const metrics = computed(() => {
  const totalItems = stockItems.value.filter(item => item.is_active).length;
  const totalStock = stockItems.value.reduce((sum, item) => sum + item.quantity, 0);
  const totalValue = stockItems.value.reduce((sum, item) => sum + (item.quantity * (item.cost_per_unit || 0)), 0);
  const lowStockItems = stockItems.value.filter(item => item.quantity > 0 && item.quantity < 10).length;
  const outOfStockItems = stockItems.value.filter(item => item.quantity === 0).length;
  
  const filteredLogs = getFilteredLogs();
  
  // Calculate withdrawal stats
  const withdrawLogs = filteredLogs.filter(log => log.action_type === 'WITHDRAW');
  const totalWithdrawn = withdrawLogs.reduce((sum, log) => sum + log.amount, 0);
  const withdrawValue = withdrawLogs.reduce((sum, log) => {
    const cost = log.cost_per_unit || itemCostMap.value[log.item_id] || 0;
    return sum + (log.amount * cost);
  }, 0);
  
  // Calculate restock stats
  const restockLogs = filteredLogs.filter(log => log.action_type === 'RESTOCK');
  const totalRestocked = restockLogs.reduce((sum, log) => sum + log.amount, 0);
  const restockValue = restockLogs.reduce((sum, log) => {
    const cost = log.cost_per_unit || itemCostMap.value[log.item_id] || 0;
    return sum + (log.amount * cost);
  }, 0);

  return {
    totalItems,
    totalStock,
    totalValue,
    lowStockItems,
    outOfStockItems,
    totalWithdrawn,
    totalRestocked,
    withdrawValue,
    restockValue,
  };
});

// Low stock list (1-9 pieces)
const lowStockList = computed(() => {
  return stockItems.value
    .filter(item => item.quantity > 0 && item.quantity < 10)
    .sort((a, b) => a.quantity - b.quantity);
});

// Out of stock list (0 pieces)
const outOfStockList = computed(() => {
  return stockItems.value
    .filter(item => item.quantity === 0)
    .sort((a, b) => a.name.localeCompare(b.name, 'th'));
});

// Filtered items for main table
const filteredItems = computed(() => {
  let items = [...stockItems.value].filter(item => item.is_active);
  
  // Search filter
  if (searchTerm.value.trim()) {
    const search = searchTerm.value.toLowerCase();
    items = items.filter(item => 
      item.name.toLowerCase().includes(search) ||
      item.description?.toLowerCase().includes(search)
    );
  }
  
  // Sort
  items.sort((a, b) => {
    let comparison = 0;
    if (sortField.value === 'name') {
      comparison = a.name.localeCompare(b.name, 'th');
    } else if (sortField.value === 'quantity') {
      comparison = a.quantity - b.quantity;
    }
    return sortDirection.value === 'asc' ? comparison : -comparison;
  });
  
  return items;
});

// Paginated items
const totalPages = computed(() => Math.ceil(filteredItems.value.length / itemsPerPage));
const paginatedItems = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage;
  return filteredItems.value.slice(start, start + itemsPerPage);
});

// Helper functions
function getBranchWithdrawAmount(itemId: number, branch: string): number {
  return branchWithdrawData.value[itemId]?.[branch] || 0;
}

function getTotalWithdrawForItem(itemId: number): number {
  const itemData = branchWithdrawData.value[itemId];
  if (!itemData) return 0;
  return Object.values(itemData).reduce((sum, val) => sum + val, 0);
}

function sortBy(field: 'name' | 'quantity') {
  if (sortField.value === field) {
    sortDirection.value = sortDirection.value === 'asc' ? 'desc' : 'asc';
  } else {
    sortField.value = field;
    sortDirection.value = 'asc';
  }
  currentPage.value = 1;
}

// Date range helper
function getDateRange(): { start: Date; end: Date } {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  
  switch (selectedPeriod.value) {
    case 'this_week':
      const weekStart = new Date(today);
      weekStart.setDate(weekStart.getDate() - weekStart.getDay());
      return { start: weekStart, end: now };
    case 'last_week':
      const lastWeekEnd = new Date(today);
      lastWeekEnd.setDate(lastWeekEnd.getDate() - lastWeekEnd.getDay());
      const lastWeekStart = new Date(lastWeekEnd);
      lastWeekStart.setDate(lastWeekStart.getDate() - 7);
      return { start: lastWeekStart, end: lastWeekEnd };
    case 'this_month':
      return { start: new Date(now.getFullYear(), now.getMonth(), 1), end: now };
    case 'last_month':
      return { 
        start: new Date(now.getFullYear(), now.getMonth() - 1, 1), 
        end: new Date(now.getFullYear(), now.getMonth(), 0) 
      };
    case 'custom':
      return {
        start: customStartDate.value ? new Date(customStartDate.value) : new Date(now.getFullYear(), now.getMonth(), 1),
        end: customEndDate.value ? new Date(customEndDate.value + 'T23:59:59') : now,
      };
    default:
      return { start: new Date(now.getFullYear(), now.getMonth(), 1), end: now };
  }
}

function getFilteredLogs(): LogEntry[] {
  const { start, end } = getDateRange();
  const endOfDay = new Date(end);
  endOfDay.setHours(23, 59, 59, 999);
  
  return logEntries.value.filter(log => {
    const dateStr = log.report_date || log.created_at || '';
    if (!dateStr) return false;
    
    const logDate = dateStr.includes('T') 
      ? new Date(dateStr) 
      : new Date(dateStr + 'T00:00:00');
    
    const inDateRange = logDate >= start && logDate <= endOfDay;
    const isValidAction = log.action_type === 'WITHDRAW' || log.action_type === 'RESTOCK';
    return inDateRange && isValidAction;
  });
}

// Data fetching
async function fetchData() {
  loading.value = true;
  try {
    // Fetch stock items
    const { data: items, error: itemsError } = await supabase
      .from('items')
      .select('*')
      .eq('is_active', true)
      .order('name');
    
    if (itemsError) console.error('Error fetching items:', itemsError);
    stockItems.value = items || [];

    // Fetch all logs
    const { data: logs, error: logsError } = await supabase
      .from('logs')
      .select('*, items(name)')
      .order('report_date', { ascending: false });
    
    if (logsError) {
      console.error('Error fetching logs:', logsError);
      const { data: fallbackLogs } = await supabase
        .from('logs')
        .select('*')
        .order('report_date', { ascending: false });
      
      logEntries.value = fallbackLogs || [];
    } else {
      logEntries.value = (logs || []).map(log => ({
        ...log,
        item_name: log.items?.name || log.item_name || 'Unknown',
      }));
    }
  } catch (error) {
    console.error('Error fetching data:', error);
  } finally {
    loading.value = false;
  }
}

async function refreshData() {
  await fetchData();
}

// Auth handling
async function checkAuth() {
  const { data: { session } } = await supabase.auth.getSession();
  currentUser.value = session?.user || null;
  isLoggedIn.value = !!session?.user;
}

// Watch for search changes to reset pagination
watch(searchTerm, () => {
  currentPage.value = 1;
});

// Lifecycle
let authSubscription: any = null;

onMounted(async () => {
  await checkAuth();
  if (isLoggedIn.value) {
    await fetchData();
  }

  authSubscription = supabase.auth.onAuthStateChange((event, session) => {
    currentUser.value = session?.user || null;
    isLoggedIn.value = !!session?.user;
    if (session?.user) fetchData();
  });

  window.addEventListener('auth-change', (e: any) => {
    isLoggedIn.value = !!e.detail?.user;
    if (e.detail?.user) fetchData();
  });
});

onUnmounted(() => {
  authSubscription?.data?.subscription?.unsubscribe();
});
</script>
