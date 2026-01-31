<template>
  <div class="relative min-h-screen">
    <!-- Main Dashboard Content -->
    <div :class="{ 'blur-sm pointer-events-none select-none': !isLoggedIn }">
      <!-- Filters Section -->
      <div class="mb-6">
        <Card>
          <CardHeader class="pb-4">
            <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div class="flex items-center gap-2">
                <Filter class="h-5 w-5 text-gray-500" />
                <CardTitle class="text-base">ตัวกรองข้อมูล</CardTitle>
              </div>
              <div class="flex flex-wrap gap-3">
                <!-- Date Range Filter -->
                <div class="flex items-center gap-2">
                  <Calendar class="h-4 w-4 text-gray-500" />
                  <Select v-model="selectedPeriod" class="w-40">
                    <option value="all">ทั้งหมด</option>
                    <option value="today">วันนี้</option>
                    <option value="yesterday">เมื่อวาน</option>
                    <option value="this_week">สัปดาห์นี้</option>
                    <option value="last_week">สัปดาห์ที่แล้ว</option>
                    <option value="this_month">เดือนนี้</option>
                    <option value="last_month">เดือนที่แล้ว</option>
                    <option value="this_quarter">ไตรมาสนี้</option>
                    <option value="this_year">ปีนี้</option>
                    <option value="custom">กำหนดเอง</option>
                  </Select>
                </div>

                <!-- Custom Date Range -->
                <div v-if="selectedPeriod === 'custom'" class="flex items-center gap-2">
                  <input 
                    type="date" 
                    v-model="customStartDate"
                    class="h-10 px-3 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
                  />
                  <span class="text-gray-400">ถึง</span>
                  <input 
                    type="date" 
                    v-model="customEndDate"
                    class="h-10 px-3 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
                  />
                </div>

                <!-- Branch Filter -->
                <div class="flex items-center gap-2">
                  <Building2 class="h-4 w-4 text-gray-500" />
                  <Select v-model="selectedBranch" class="w-40">
                    <option value="all">ทุกสาขา</option>
                    <option v-for="branch in branches" :key="branch" :value="branch">
                      {{ branch }}
                    </option>
                  </Select>
                </div>

                <!-- Refresh Button -->
                <Button variant="outline" size="icon" @click="refreshData" :disabled="loading">
                  <RefreshCw :class="['h-4 w-4', { 'animate-spin': loading }]" />
                </Button>
              </div>
            </div>
          </CardHeader>
        </Card>
      </div>

      <!-- Metric Cards -->
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <!-- Total Items -->
        <Card>
          <CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle class="text-sm font-medium text-gray-500">จำนวนรายการทั้งหมด</CardTitle>
            <Package class="h-5 w-5 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div class="text-2xl font-bold">{{ formatNumber(metrics.totalItems) }}</div>
            <p class="text-xs text-gray-500 mt-1">รายการสินค้า</p>
          </CardContent>
        </Card>

        <!-- Total Stock -->
        <Card>
          <CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle class="text-sm font-medium text-gray-500">จำนวนสินค้าคงคลัง</CardTitle>
            <Boxes class="h-5 w-5 text-green-500" />
          </CardHeader>
          <CardContent>
            <div class="text-2xl font-bold text-green-600">{{ formatNumber(metrics.totalStock) }}</div>
            <p class="text-xs text-gray-500 mt-1">ชิ้น</p>
          </CardContent>
        </Card>

        <!-- Total Withdraw -->
        <Card>
          <CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle class="text-sm font-medium text-gray-500">เบิกจ่ายทั้งหมด</CardTitle>
            <ArrowDownCircle class="h-5 w-5 text-red-500" />
          </CardHeader>
          <CardContent>
            <div class="text-2xl font-bold text-red-600">{{ formatNumber(metrics.totalWithdrawn) }}</div>
            <p class="text-xs text-gray-500 mt-1">ชิ้น (ในช่วงเวลา)</p>
          </CardContent>
        </Card>

        <!-- Total Restock -->
        <Card>
          <CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle class="text-sm font-medium text-gray-500">รับเข้าทั้งหมด</CardTitle>
            <ArrowUpCircle class="h-5 w-5 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div class="text-2xl font-bold text-blue-600">{{ formatNumber(metrics.totalRestocked) }}</div>
            <p class="text-xs text-gray-500 mt-1">ชิ้น (ในช่วงเวลา)</p>
          </CardContent>
        </Card>
      </div>

      <!-- Additional Metrics Row -->
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <!-- Total Value -->
        <Card>
          <CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle class="text-sm font-medium text-gray-500">มูลค่าคงคลัง</CardTitle>
            <BadgeDollarSign class="h-5 w-5 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div class="text-xl font-bold text-amber-600">{{ formatCurrency(metrics.totalValue) }}</div>
            <p class="text-xs text-gray-500 mt-1">ต้นทุนรวม</p>
          </CardContent>
        </Card>

        <!-- Low Stock Alert -->
        <Card>
          <CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle class="text-sm font-medium text-gray-500">สินค้าใกล้หมด</CardTitle>
            <AlertTriangle class="h-5 w-5 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div class="text-2xl font-bold text-orange-600">{{ metrics.lowStockItems }}</div>
            <p class="text-xs text-gray-500 mt-1">รายการ (&lt;10 ชิ้น)</p>
          </CardContent>
        </Card>

        <!-- Out of Stock -->
        <Card>
          <CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle class="text-sm font-medium text-gray-500">สินค้าหมด</CardTitle>
            <XCircle class="h-5 w-5 text-red-500" />
          </CardHeader>
          <CardContent>
            <div class="text-2xl font-bold text-red-600">{{ metrics.outOfStockItems }}</div>
            <p class="text-xs text-gray-500 mt-1">รายการ (0 ชิ้น)</p>
          </CardContent>
        </Card>

        <!-- Total Transactions -->
        <Card>
          <CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle class="text-sm font-medium text-gray-500">จำนวนทำรายการ</CardTitle>
            <Activity class="h-5 w-5 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div class="text-2xl font-bold text-purple-600">{{ formatNumber(metrics.totalTransactions) }}</div>
            <p class="text-xs text-gray-500 mt-1">รายการ (ในช่วงเวลา)</p>
          </CardContent>
        </Card>
      </div>

      <!-- Charts Section -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <!-- Stock Movement Chart -->
        <Card>
          <CardHeader>
            <div class="flex items-center justify-between">
              <div>
                <CardTitle>กราฟการเคลื่อนไหวสินค้า</CardTitle>
                <CardDescription>รับเข้า vs เบิกจ่าย ตามช่วงเวลา</CardDescription>
              </div>
              <TrendingUp class="h-5 w-5 text-gray-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div class="h-72">
              <Line v-if="stockMovementData" :data="stockMovementData" :options="lineChartOptions" />
            </div>
          </CardContent>
        </Card>

        <!-- Top Items Chart -->
        <Card>
          <CardHeader>
            <div class="flex items-center justify-between">
              <div>
                <CardTitle>สินค้าที่เบิกมากที่สุด</CardTitle>
                <CardDescription>Top 5 รายการที่มีการเบิกสูงสุด</CardDescription>
              </div>
              <BarChart3 class="h-5 w-5 text-gray-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div class="h-72">
              <Bar v-if="topItemsData" :data="topItemsData" :options="barChartOptions" />
            </div>
          </CardContent>
        </Card>
      </div>

      <!-- More Charts -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <!-- Branch Distribution -->
        <Card>
          <CardHeader>
            <div class="flex items-center justify-between">
              <div>
                <CardTitle>การเบิกจ่ายตามสาขา</CardTitle>
                <CardDescription>สัดส่วนการเบิกแยกตามสาขา</CardDescription>
              </div>
              <PieChartIcon class="h-5 w-5 text-gray-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div class="h-72 flex items-center justify-center">
              <Doughnut v-if="branchDistributionData" :data="branchDistributionData" :options="doughnutChartOptions" />
            </div>
          </CardContent>
        </Card>

        <!-- Recent Activity -->
        <Card>
          <CardHeader>
            <div class="flex items-center justify-between">
              <div>
                <CardTitle>กิจกรรมล่าสุด</CardTitle>
                <CardDescription>รายการล่าสุดที่มีการทำรายการ</CardDescription>
              </div>
              <Clock class="h-5 w-5 text-gray-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div class="space-y-3 max-h-72 overflow-y-auto">
              <div 
                v-for="activity in recentActivities" 
                :key="activity.id"
                class="flex items-start gap-3 p-3 bg-gray-50 rounded-lg"
              >
                <div :class="[
                  'p-2 rounded-full',
                  activity.action_type === 'WITHDRAW' ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'
                ]">
                  <ArrowDownCircle v-if="activity.action_type === 'WITHDRAW'" class="h-4 w-4" />
                  <ArrowUpCircle v-else class="h-4 w-4" />
                </div>
                <div class="flex-1 min-w-0">
                  <p class="text-sm font-medium text-gray-900 truncate">{{ activity.item_name }}</p>
                  <p class="text-xs text-gray-500">
                    {{ activity.action_type === 'WITHDRAW' ? 'เบิก' : 'รับเข้า' }} 
                    <span class="font-semibold">{{ activity.amount }}</span> ชิ้น
                    <span v-if="activity.branch" class="text-gray-400">• {{ activity.branch }}</span>
                  </p>
                  <p class="text-xs text-gray-400">{{ formatShortDate(activity.report_date || activity.created_at || '') }}</p>
                </div>
              </div>
              <div v-if="recentActivities.length === 0" class="text-center py-8 text-gray-400">
                <Clock class="h-10 w-10 mx-auto mb-2 opacity-50" />
                <p>ไม่มีข้อมูลกิจกรรมในช่วงเวลานี้</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <!-- Branch Comparison Section -->
      <div class="mb-6">
        <Card>
          <CardHeader>
            <div class="flex items-center justify-between">
              <div>
                <CardTitle>เปรียบเทียบสาขา 6 รายการยอดนิยม</CardTitle>
                <CardDescription>เปรียบเทียบการเบิกจ่ายระหว่าง 4 สาขา</CardDescription>
              </div>
              <Building2 class="h-5 w-5 text-gray-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div class="h-80">
              <Bar v-if="branchComparisonData" :data="branchComparisonData" :options="branchComparisonOptions" />
            </div>
          </CardContent>
        </Card>
      </div>

      <!-- Branch Cards -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card v-for="(stats, branchName) in branchStats" :key="branchName" class="relative overflow-hidden">
          <div :class="['absolute top-0 left-0 w-1 h-full', getBranchColor(branchName as string)]"></div>
          <CardHeader class="pb-2">
            <div class="flex items-center justify-between">
              <CardTitle class="text-sm font-medium">{{ branchName }}</CardTitle>
              <Building2 :class="['h-4 w-4', getBranchTextColor(branchName as string)]" />
            </div>
          </CardHeader>
          <CardContent class="space-y-3">
            <div class="flex justify-between items-center">
              <span class="text-xs text-gray-500">เบิกทั้งหมด</span>
              <span class="text-lg font-bold text-red-600">{{ formatNumber(stats.totalWithdraw) }}</span>
            </div>
            <div class="flex justify-between items-center">
              <span class="text-xs text-gray-500">จำนวนรายการ</span>
              <span class="text-sm font-semibold text-gray-700">{{ stats.transactionCount }} ครั้ง</span>
            </div>
            <div class="flex justify-between items-center">
              <span class="text-xs text-gray-500">สัดส่วน</span>
              <Badge :variant="getBranchBadgeVariant(branchName as string)">
                {{ stats.percentage.toFixed(1) }}%
              </Badge>
            </div>
            <!-- Mini progress bar -->
            <div class="w-full bg-gray-100 rounded-full h-2">
              <div 
                :class="['h-2 rounded-full transition-all', getBranchColor(branchName as string)]"
                :style="{ width: `${stats.percentage}%` }"
              ></div>
            </div>
          </CardContent>
        </Card>
      </div>

      <!-- Branch Detail Table -->
      <Card class="mb-6">
        <CardHeader>
          <div class="flex items-center justify-between">
            <div>
              <CardTitle>ตารางเปรียบเทียบรายละเอียดสาขา</CardTitle>
              <CardDescription>สรุปข้อมูลการเบิกจ่ายแยกตามสาขาและสินค้า</CardDescription>
            </div>
            <BarChart3 class="h-5 w-5 text-gray-400" />
          </div>
        </CardHeader>
        <CardContent>
          <div class="overflow-x-auto">
            <table class="w-full text-sm">
              <thead>
                <tr class="border-b border-gray-200 bg-gray-50">
                  <th class="text-left py-3 px-4 font-semibold text-gray-600">สินค้า</th>
                  <th v-for="branch in mainBranches" :key="branch" class="text-center py-3 px-4 font-semibold text-gray-600 min-w-[100px]">
                    <div class="flex flex-col items-center gap-1">
                      <span>{{ branch }}</span>
                      <div :class="['w-8 h-1 rounded', getBranchColor(branch)]"></div>
                    </div>
                  </th>
                  <th class="text-center py-3 px-4 font-semibold text-gray-600 bg-gray-100">รวม</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="item in topWithdrawItems" :key="item.name" class="border-b border-gray-100 hover:bg-gray-50">
                  <td class="py-3 px-4 font-medium">{{ item.name }}</td>
                  <td v-for="branch in mainBranches" :key="branch" class="py-3 px-4 text-center">
                    <span :class="getItemBranchAmount(item.name, branch) > 0 ? 'font-semibold text-gray-700' : 'text-gray-300'">
                      {{ getItemBranchAmount(item.name, branch) || '-' }}
                    </span>
                  </td>
                  <td class="py-3 px-4 text-center font-bold text-red-600 bg-gray-50">{{ item.total }}</td>
                </tr>
                <tr v-if="topWithdrawItems.length === 0">
                  <td :colspan="mainBranches.length + 2" class="py-8 text-center text-gray-400">
                    ไม่มีข้อมูลการเบิกในช่วงเวลานี้
                  </td>
                </tr>
              </tbody>
              <tfoot class="bg-gray-100 font-semibold">
                <tr>
                  <td class="py-3 px-4">รวมทั้งหมด</td>
                  <td v-for="branch in mainBranches" :key="branch" class="py-3 px-4 text-center text-red-600">
                    {{ formatNumber(branchStats[branch]?.totalWithdraw || 0) }}
                  </td>
                  <td class="py-3 px-4 text-center text-red-700 bg-red-50">
                    {{ formatNumber(Object.values(branchStats).reduce((sum, s) => sum + s.totalWithdraw, 0)) }}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </CardContent>
      </Card>

      <!-- Low Stock Table -->
      <Card>
        <CardHeader>
          <div class="flex items-center justify-between">
            <div>
              <CardTitle>รายการสินค้าที่ต้องเติม</CardTitle>
              <CardDescription>สินค้าที่มีจำนวนคงเหลือน้อยกว่า 10 ชิ้น</CardDescription>
            </div>
            <AlertTriangle class="h-5 w-5 text-orange-500" />
          </div>
        </CardHeader>
        <CardContent>
          <div class="overflow-x-auto">
            <table class="w-full text-sm">
              <thead>
                <tr class="border-b border-gray-200">
                  <th class="text-left py-3 px-4 font-semibold text-gray-600">สินค้า</th>
                  <th class="text-right py-3 px-4 font-semibold text-gray-600">คงเหลือ</th>
                  <th class="text-right py-3 px-4 font-semibold text-gray-600">รับเข้าทั้งหมด</th>
                  <th class="text-right py-3 px-4 font-semibold text-gray-600">ใช้ไปแล้ว</th>
                  <th class="text-center py-3 px-4 font-semibold text-gray-600">สถานะ</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="item in lowStockList" :key="item.id" class="border-b border-gray-100 hover:bg-gray-50">
                  <td class="py-3 px-4">
                    <div class="flex items-center gap-3">
                      <div class="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center overflow-hidden">
                        <img 
                          v-if="item.image_url" 
                          :src="item.image_url" 
                          :alt="item.name" 
                          class="w-full h-full object-cover"
                        />
                        <Package v-else class="h-5 w-5 text-gray-400" />
                      </div>
                      <span class="font-medium">{{ item.name }}</span>
                    </div>
                  </td>
                  <td class="py-3 px-4 text-right font-bold" :class="item.quantity === 0 ? 'text-red-600' : 'text-orange-600'">
                    {{ item.quantity }}
                  </td>
                  <td class="py-3 px-4 text-right text-blue-600">{{ item.total_quantity }}</td>
                  <td class="py-3 px-4 text-right text-red-600">{{ item.total_quantity - item.quantity }}</td>
                  <td class="py-3 px-4 text-center">
                    <Badge :variant="item.quantity === 0 ? 'destructive' : 'warning'">
                      {{ item.quantity === 0 ? 'หมดแล้ว' : 'ใกล้หมด' }}
                    </Badge>
                  </td>
                </tr>
                <tr v-if="lowStockList.length === 0">
                  <td colspan="5" class="py-8 text-center text-gray-400">
                    <CheckCircle2 class="h-10 w-10 mx-auto mb-2 text-green-500" />
                    <p>สินค้าทุกรายการมีจำนวนเพียงพอ</p>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue';
import { supabase, type User } from '@/lib/supabase';
import { formatNumber, formatCurrency, formatShortDate } from '@/lib/utils';
import { 
  Card, CardHeader, CardTitle, CardDescription, CardContent, 
  Button, Select, Badge 
} from '@/components/ui';
import {
  Package, Boxes, ArrowDownCircle, ArrowUpCircle, AlertTriangle,
  XCircle, Activity, BadgeDollarSign, TrendingUp, BarChart3,
  PieChart as PieChartIcon, Clock, Filter, Calendar, Building2,
  RefreshCw, CheckCircle2
} from 'lucide-vue-next';
import { Line, Bar, Doughnut } from 'vue-chartjs';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import type { StockItem, LogEntry } from '@/components/stock/types';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

// State
const isLoggedIn = ref(false);
const currentUser = ref<User | null>(null);
const loading = ref(false);

// Filter state
const selectedPeriod = ref('this_year');
const customStartDate = ref('');
const customEndDate = ref('');
const selectedBranch = ref('all');
const branches = ref<string[]>([]);

// Data state
const stockItems = ref<StockItem[]>([]);
const logEntries = ref<LogEntry[]>([]);
const recentActivities = ref<LogEntry[]>([]);

// Computed metrics
const metrics = computed(() => {
  const totalItems = stockItems.value.length;
  const totalStock = stockItems.value.reduce((sum, item) => sum + item.quantity, 0);
  const totalValue = stockItems.value.reduce((sum, item) => sum + (item.quantity * (item.cost_per_unit || 0)), 0);
  const lowStockItems = stockItems.value.filter(item => item.quantity > 0 && item.quantity < 10).length;
  const outOfStockItems = stockItems.value.filter(item => item.quantity === 0).length;
  
  const filteredLogs = getFilteredLogs();
  const totalWithdrawn = filteredLogs
    .filter(log => log.action_type === 'WITHDRAW')
    .reduce((sum, log) => sum + log.amount, 0);
  const totalRestocked = filteredLogs
    .filter(log => log.action_type === 'RESTOCK')
    .reduce((sum, log) => sum + log.amount, 0);
  const totalTransactions = filteredLogs.length;

  return {
    totalItems,
    totalStock,
    totalValue,
    lowStockItems,
    outOfStockItems,
    totalWithdrawn,
    totalRestocked,
    totalTransactions,
  };
});

const lowStockList = computed(() => {
  return stockItems.value
    .filter(item => item.quantity < 10)
    .sort((a, b) => a.quantity - b.quantity);
});

// Chart data
const stockMovementData = computed(() => {
  const filteredLogs = getFilteredLogs();
  const dailyData = groupByDate(filteredLogs);
  
  const labels = Object.keys(dailyData).sort();
  const withdrawData = labels.map(date => dailyData[date].withdraw);
  const restockData = labels.map(date => dailyData[date].restock);

  return {
    labels: labels.map(d => formatShortDate(d)),
    datasets: [
      {
        label: 'รับเข้า',
        data: restockData,
        borderColor: '#3b82f6',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        fill: true,
        tension: 0.4,
      },
      {
        label: 'เบิกจ่าย',
        data: withdrawData,
        borderColor: '#ef4444',
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        fill: true,
        tension: 0.4,
      },
    ],
  };
});

const topItemsData = computed(() => {
  const filteredLogs = getFilteredLogs();
  const withdrawByItem = filteredLogs
    .filter(log => log.action_type === 'WITHDRAW')
    .reduce((acc, log) => {
      const name = log.item_name || log.items?.name || 'Unknown';
      acc[name] = (acc[name] || 0) + log.amount;
      return acc;
    }, {} as Record<string, number>);

  const sorted = Object.entries(withdrawByItem)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  return {
    labels: sorted.map(([name]) => name.length > 15 ? name.substring(0, 15) + '...' : name),
    datasets: [
      {
        label: 'จำนวนที่เบิก',
        data: sorted.map(([, value]) => value),
        backgroundColor: [
          '#ef4444',
          '#f97316',
          '#f59e0b',
          '#84cc16',
          '#22c55e',
        ],
        borderRadius: 8,
      },
    ],
  };
});

const branchDistributionData = computed(() => {
  const filteredLogs = getFilteredLogs();
  const withdrawByBranch = filteredLogs
    .filter(log => log.action_type === 'WITHDRAW' && log.branch)
    .reduce((acc, log) => {
      const branch = log.branch || 'ไม่ระบุ';
      acc[branch] = (acc[branch] || 0) + log.amount;
      return acc;
    }, {} as Record<string, number>);

  const sorted = Object.entries(withdrawByBranch)
    .sort((a, b) => b[1] - a[1]);

  return {
    labels: sorted.map(([name]) => name),
    datasets: [
      {
        data: sorted.map(([, value]) => value),
        backgroundColor: [
          '#3b82f6',
          '#8b5cf6',
          '#ec4899',
          '#f97316',
          '#22c55e',
          '#06b6d4',
          '#f59e0b',
        ],
        borderWidth: 0,
      },
    ],
  };
});

// Main 4 branches - customize these names based on your actual branches
const mainBranches = computed(() => {
  // Get top 4 branches from data, or use defaults
  const branchCounts = logEntries.value
    .filter(log => log.action_type === 'WITHDRAW' && log.branch)
    .reduce((acc, log) => {
      const branch = log.branch!;
      acc[branch] = (acc[branch] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  
  const sorted = Object.entries(branchCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([name]) => name);
  
  return sorted.length > 0 ? sorted : ['สาขา 1', 'สาขา 2', 'สาขา 3', 'สาขา 4'];
});

// Branch statistics
const branchStats = computed(() => {
  const filteredLogs = getFilteredLogs();
  const stats: Record<string, { totalWithdraw: number; transactionCount: number; percentage: number }> = {};
  
  // Calculate total for percentage
  const grandTotal = filteredLogs
    .filter(log => log.action_type === 'WITHDRAW')
    .reduce((sum, log) => sum + log.amount, 0);
  
  // Calculate stats for each main branch
  for (const branch of mainBranches.value) {
    const branchLogs = filteredLogs.filter(
      log => log.action_type === 'WITHDRAW' && log.branch === branch
    );
    const totalWithdraw = branchLogs.reduce((sum, log) => sum + log.amount, 0);
    stats[branch] = {
      totalWithdraw,
      transactionCount: branchLogs.length,
      percentage: grandTotal > 0 ? (totalWithdraw / grandTotal) * 100 : 0,
    };
  }
  
  return stats;
});

// Branch comparison chart data
const branchComparisonData = computed(() => {
  const filteredLogs = getFilteredLogs();
  
  // Get top 5 items for comparison
  const itemTotals = filteredLogs
    .filter(log => log.action_type === 'WITHDRAW')
    .reduce((acc, log) => {
      const name = log.item_name || 'Unknown';
      acc[name] = (acc[name] || 0) + log.amount;
      return acc;
    }, {} as Record<string, number>);
  
  const topItems = Object.entries(itemTotals)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([name]) => name);
  
  // Build datasets for each branch
  const branchColors: Record<string, { bg: string; border: string }> = {
    [mainBranches.value[0]]: { bg: 'rgba(59, 130, 246, 0.8)', border: '#3b82f6' },
    [mainBranches.value[1]]: { bg: 'rgba(139, 92, 246, 0.8)', border: '#8b5cf6' },
    [mainBranches.value[2]]: { bg: 'rgba(236, 72, 153, 0.8)', border: '#ec4899' },
    [mainBranches.value[3]]: { bg: 'rgba(249, 115, 22, 0.8)', border: '#f97316' },
  };
  
  const datasets = mainBranches.value.map(branch => ({
    label: branch,
    data: topItems.map(item => {
      return filteredLogs
        .filter(log => 
          log.action_type === 'WITHDRAW' && 
          log.branch === branch && 
          log.item_name === item
        )
        .reduce((sum, log) => sum + log.amount, 0);
    }),
    backgroundColor: branchColors[branch]?.bg || 'rgba(156, 163, 175, 0.8)',
    borderColor: branchColors[branch]?.border || '#9ca3af',
    borderWidth: 1,
    borderRadius: 4,
  }));
  
  return {
    labels: topItems.map(name => name.length > 12 ? name.substring(0, 12) + '...' : name),
    datasets,
  };
});

// Top withdraw items by branch
const topWithdrawItems = computed(() => {
  const filteredLogs = getFilteredLogs();
  
  // Get withdrawals grouped by item and branch
  const itemBranchData: Record<string, Record<string, number>> = {};
  
  filteredLogs
    .filter(log => log.action_type === 'WITHDRAW')
    .forEach(log => {
      const itemName = log.item_name || 'Unknown';
      const branch = log.branch || 'ไม่ระบุ';
      
      if (!itemBranchData[itemName]) {
        itemBranchData[itemName] = {};
      }
      itemBranchData[itemName][branch] = (itemBranchData[itemName][branch] || 0) + log.amount;
    });
  
  // Calculate totals and sort
  const items = Object.entries(itemBranchData)
    .map(([name, branches]) => ({
      name,
      branches,
      total: Object.values(branches).reduce((sum, val) => sum + val, 0),
    }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 10);
  
  return items;
});

// Helper function to get item amount by branch
function getItemBranchAmount(itemName: string, branch: string): number {
  const item = topWithdrawItems.value.find(i => i.name === itemName);
  return item?.branches[branch] || 0;
}

// Branch color helpers
function getBranchColor(branch: string): string {
  const index = mainBranches.value.indexOf(branch);
  const colors = ['bg-blue-500', 'bg-purple-500', 'bg-pink-500', 'bg-orange-500'];
  return colors[index] || 'bg-gray-400';
}

function getBranchTextColor(branch: string): string {
  const index = mainBranches.value.indexOf(branch);
  const colors = ['text-blue-500', 'text-purple-500', 'text-pink-500', 'text-orange-500'];
  return colors[index] || 'text-gray-400';
}

function getBranchBadgeVariant(branch: string): 'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'warning' {
  const index = mainBranches.value.indexOf(branch);
  const variants: Array<'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'warning'> = ['default', 'secondary', 'outline', 'warning'];
  return variants[index] || 'secondary';
}

// Branch comparison chart options
const branchComparisonOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: 'top' as const,
    },
    title: {
      display: false,
    },
  },
  scales: {
    x: {
      grid: {
        display: false,
      },
    },
    y: {
      beginAtZero: true,
      grid: {
        color: 'rgba(0, 0, 0, 0.05)',
      },
    },
  },
};

// Chart options
const lineChartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: 'top' as const,
    },
  },
  scales: {
    y: {
      beginAtZero: true,
    },
  },
};

const barChartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  indexAxis: 'y' as const,
  plugins: {
    legend: {
      display: false,
    },
  },
  scales: {
    x: {
      beginAtZero: true,
    },
  },
};

const doughnutChartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: 'right' as const,
    },
  },
};

// Helper functions
function getDateRange(): { start: Date; end: Date } {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  
  switch (selectedPeriod.value) {
    case 'all':
      // Return all data from beginning of time to now
      return { start: new Date(2020, 0, 1), end: now };
    case 'today':
      return { start: today, end: now };
    case 'yesterday':
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      return { start: yesterday, end: today };
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
    case 'this_quarter':
      const quarterMonth = Math.floor(now.getMonth() / 3) * 3;
      return { start: new Date(now.getFullYear(), quarterMonth, 1), end: now };
    case 'this_year':
      return { start: new Date(now.getFullYear(), 0, 1), end: now };
    case 'custom':
      return {
        start: customStartDate.value ? new Date(customStartDate.value) : new Date(now.getFullYear(), 0, 1),
        end: customEndDate.value ? new Date(customEndDate.value + 'T23:59:59') : now,
      };
    default:
      return { start: new Date(now.getFullYear(), now.getMonth(), 1), end: now };
  }
}

function getFilteredLogs(): LogEntry[] {
  const { start, end } = getDateRange();
  
  // Set end date to end of day for proper comparison
  const endOfDay = new Date(end);
  endOfDay.setHours(23, 59, 59, 999);
  
  return logEntries.value.filter(log => {
    // Use report_date as primary date field (format: YYYY-MM-DD)
    const dateStr = log.report_date || log.created_at || '';
    if (!dateStr) return false;
    
    // Parse date - handle both YYYY-MM-DD and ISO formats
    const logDate = dateStr.includes('T') 
      ? new Date(dateStr) 
      : new Date(dateStr + 'T00:00:00');
    
    const inDateRange = logDate >= start && logDate <= endOfDay;
    const matchBranch = selectedBranch.value === 'all' || log.branch === selectedBranch.value;
    // Only count WITHDRAW and RESTOCK actions
    const isValidAction = log.action_type === 'WITHDRAW' || log.action_type === 'RESTOCK';
    return inDateRange && matchBranch && isValidAction;
  });
}

function groupByDate(logs: LogEntry[]): Record<string, { withdraw: number; restock: number }> {
  return logs.reduce((acc, log) => {
    // Use report_date as primary date field
    const dateStr = log.report_date || log.created_at || '';
    const date = dateStr.split('T')[0];
    if (!date) return acc;
    
    if (!acc[date]) {
      acc[date] = { withdraw: 0, restock: 0 };
    }
    if (log.action_type === 'WITHDRAW') {
      acc[date].withdraw += log.amount;
    } else if (log.action_type === 'RESTOCK') {
      acc[date].restock += log.amount;
    }
    return acc;
  }, {} as Record<string, { withdraw: number; restock: number }>);
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
    
    if (itemsError) {
      console.error('Error fetching items:', itemsError);
    }
    stockItems.value = items || [];

    // Fetch all logs - no date filter to get all historical data
    const { data: logs, error: logsError } = await supabase
      .from('logs')
      .select('*, items(name)')
      .order('report_date', { ascending: false });
    
    if (logsError) {
      console.error('Error fetching logs with join:', logsError);
      // Fallback without join
      const { data: fallbackLogs } = await supabase
        .from('logs')
        .select('*')
        .order('report_date', { ascending: false });
      
      logEntries.value = (fallbackLogs || []).map(log => ({
        ...log,
        item_name: log.item_name || 'Unknown',
      }));
    } else {
      logEntries.value = (logs || []).map(log => ({
        ...log,
        item_name: log.items?.name || log.item_name || 'Unknown',
      }));
    }

    // Get recent activities (filtered by current filter)
    const filteredLogs = getFilteredLogs();
    recentActivities.value = filteredLogs.slice(0, 10);

    // Extract unique branches from all logs
    const uniqueBranches = [...new Set(logEntries.value.map(log => log.branch).filter(Boolean))];
    branches.value = uniqueBranches as string[];
    
    console.log('Data loaded:', {
      items: stockItems.value.length,
      logs: logEntries.value.length,
      filteredLogs: filteredLogs.length,
      branches: branches.value
    });
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

// Watch for filter changes
watch([selectedPeriod, selectedBranch, customStartDate, customEndDate], () => {
  // Recalculate derived data when filters change
  const filteredLogs = getFilteredLogs();
  recentActivities.value = filteredLogs.slice(0, 10);
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
    if (session?.user) {
      fetchData();
    }
  });

  window.addEventListener('auth-change', (e: any) => {
    isLoggedIn.value = !!e.detail?.user;
    if (e.detail?.user) {
      fetchData();
    }
  });
});

onUnmounted(() => {
  authSubscription?.data?.subscription?.unsubscribe();
});
</script>
