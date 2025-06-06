<template>
  <div class="dashboard">
    <!-- Dashboard Header -->
    <div class="dashboard-header">
      <h1 class="dashboard-title">Orders Dashboard</h1>
      <div class="time-interval">
        <label for="timeInterval">Time Period:</label>
        <select id="timeInterval" v-model="selectedInterval">
          <option value="today">Today</option>
          <option value="weekly">This Week</option>
          <option value="monthly">This Month</option>
          <option value="quarterly">This Quarter</option>
          <option value="halfYearly">Last 6 Months</option>
          <option value="yearly">This Year</option>
          <option value="all">All Time</option>
        </select>
      </div>
    </div>

    <!-- KPI Summary Cards -->
    <div class="metrics-container">
      <div class="metric-card">
        <h3 class="metric-title">Total Orders</h3>
        <div class="metric-value">{{ orders.length }}</div>
        <div class="metric-change">
          <span v-if="orderGrowth > 0" class="positive">↑ {{ orderGrowth }}%</span>
          <span v-else-if="orderGrowth < 0" class="negative">↓ {{ Math.abs(orderGrowth) }}%</span>
          <span v-else>0% change</span>
        </div>
      </div>
      
      <div class="metric-card">
        <h3 class="metric-title">Pending Orders</h3>
        <div class="metric-value">{{ pendingOrdersLength }}</div>
        <div class="metric-description">{{ orders.length > 0 ? Math.round((pendingOrdersLength / orders.length) * 100) : 0 }}% of total orders</div>
      </div>
      
      <div class="metric-card">
        <h3 class="metric-title">Completed Orders</h3>
        <div class="metric-value">{{ completedOrdersCount }}</div>
        <div class="metric-description">{{ orders.length > 0 ? Math.round((completedOrdersCount / orders.length) * 100) : 0 }}% of total orders</div>
      </div>
    </div>

    <!-- Main Chart -->
    <div class="chart-card main-chart">
      <h3 class="chart-title">{{ chartTitle }}</h3>
      <charts 
        :allData="chartData" 
        :chartTitle="chartTitle" 
        :xAxisData="xAxis" 
        :selectedInterval="selectedInterval" 
      />
    </div>

    <!-- Order Lists -->
    <div class="lists-container">
      <div class="list-card">
        <div class="list-header">
          <h3 class="list-title">Recent Orders</h3>
          <router-link to="/orders" class="view-all">View All</router-link>
        </div>
        <div class="list-body">
          <div v-for="order in recentOrders" :key="order.sln" class="list-item">
            <div class="list-item-content">
              <div class="customer-info">
                <span class="customer-name">{{ order.customerName }}</span>
                <span class="customer-address">{{ order.customerAddress }}</span>
              </div>
              <div class="order-info">
                <span class="order-date">{{ getFormattedDate(new Date(order.orderDate), false) }}</span>
              </div>
            </div>
            <router-link :to="{ name: 'currentOrder', params: { sln: order.sln } }" class="list-item-link">
              <span class="view-details">View</span>
            </router-link>
          </div>
          <div v-if="recentOrders.length === 0" class="empty-list">
            <p>No recent orders found</p>
          </div>
        </div>
      </div>

      <div class="list-card">
        <div class="list-header">
          <h3 class="list-title">Pending Orders</h3>
          <span class="badge">{{ pendingOrdersLength }}</span>
        </div>
        <div class="list-body">
          <div v-for="order in pendingOrders.slice(0, 5)" :key="order.sln" class="list-item">
            <div class="list-item-content">
              <div class="customer-info">
                <span class="customer-name">{{ order.customerName }}</span>
                <span class="customer-address">{{ order.customerAddress }}</span>
              </div>
              <div class="order-info">
                <span class="order-date">{{ getFormattedDate(new Date(order.orderDate), false) }}</span>
                <span class="status-badge pending">Pending</span>
              </div>
            </div>
            <router-link :to="{ name: 'currentOrder', params: { sln: order.sln } }" class="list-item-link">
              <span class="view-details">View</span>
            </router-link>
          </div>
          <div v-if="pendingOrders.length === 0" class="empty-list">
            <p>No pending orders</p>
          </div>
        </div>
      </div>

      <div class="list-card">
        <div class="list-header">
          <h3 class="list-title">Last Payments</h3>
          <span class="badge">{{ lastPaymentDetailsLength }}</span>
        </div>
        <div class="list-body">
          <div v-for="order in lastPaymentDetails.slice(0, 5)" :key="order.sln" class="list-item">
            <div class="list-item-content">
              <div class="customer-info">
                <span class="customer-name">{{ order.customerName }}</span>
                <span class="customer-address">{{ order.customerAddress }}</span>
              </div>
              <div class="order-info">
                <span class="order-date">{{ getFormattedDate(new Date(order.orderDate), false) }}</span>
                <span class="status-badge received">Received</span>
              </div>
            </div>
            <router-link :to="{ name: 'currentOrder', params: { sln: order.sln } }" class="list-item-link">
              <span class="view-details">View</span>
            </router-link>
          </div>
          <div v-if="lastPaymentDetails.length === 0" class="empty-list">
            <p>No completed payments</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { onMounted, ref, watch, watchEffect, computed, nextTick } from 'vue';
import { useSessionStore } from "@/stores/userSessionStore";
import { useOrderStore } from "@/stores/orderSessionStore";
import { useThemeStore } from "@/stores/themeStore";
import { fetchAllOrders } from "@/dbQueries";
import Charts from "@/components/Charts.vue";
import { getFormattedDate } from '@/util/util';

const sessionStore = useSessionStore();
const orderStore = useOrderStore();
const themeStore = useThemeStore();

const orders = ref([]);
const chartData = ref([]);
const pendingOrdersLength = ref(0);
const recentOrders = ref([]);
const pendingOrders = ref([]);
const lastPaymentDetails = ref([]);
const lastPaymentDetailsLength = ref(0);
const startDate = ref('');
const endDate = ref('');
const selectedInterval = ref('today');
const chartTitle = ref('');
const xAxis = ref([]);
const orderGrowth = ref(0);

// Computed property for completed orders count
const completedOrdersCount = computed(() => {
  return orders.value.filter(order => order.status === 'recieved').length;
});

// Today's Date
const today = new Date();

// Fetch all orders
const allOrders = async () => {
  orders.value = await fetchAllOrders();
  orderStore.saveOrders(orders.value);
};

// Calculate order growth compared to previous period
const calculateOrderGrowth = (timeInterval) => {
  // Current period orders
  const currentPeriodOrders = orders.value.filter(
    order => new Date(order.orderDate).getTime() >= timeInterval
  );
  
  // Previous period orders (same duration before the current period)
  const previousPeriodStart = timeInterval - (today.getTime() - timeInterval);
  const previousPeriodOrders = orders.value.filter(
    order => new Date(order.orderDate).getTime() >= previousPeriodStart && new Date(order.orderDate).getTime() < timeInterval
  );
  
  if (previousPeriodOrders.length === 0) {
    return currentPeriodOrders.length > 0 ? 100 : 0; // 100% growth if no previous orders but have current orders
  }
  
  const growthRate = ((currentPeriodOrders.length - previousPeriodOrders.length) / previousPeriodOrders.length) * 100;
  return Math.round(growthRate);
};

// Update the orders data
const updateOrdersData = () => {
  const {timeInterval, title, xaxis} = getStartDate();

  chartTitle.value = title;
  xAxis.value = xaxis;

  // Calculate order growth
  orderGrowth.value = calculateOrderGrowth(timeInterval);

  // Clear the chartData
  const {data, filteredOrders} = getChartData(selectedInterval.value, timeInterval);
  chartData.value = convertDataMapToArray(data, xaxis);

  recentOrders.value = orders.value.slice(0, 5);
  pendingOrders.value = orders.value.filter(
      item => (new Date(item.orderDate).getTime() >= timeInterval) && (item.status === 'placed')
  );
  lastPaymentDetails.value = orders.value.filter(
      item => (new Date(item.orderDate).getTime() >= timeInterval) && (item.status === 'recieved')
  );

  pendingOrdersLength.value = pendingOrders.value.length;
  lastPaymentDetailsLength.value = lastPaymentDetails.value.length;
};

// Get start date based on the selected interval
const getStartDate = () => {
  let timeInterval;
  let title;
  let xaxis;

  // Define getMonth()
  const getMonthName = (offset) => {
    const thisMonth = new Date().getMonth()+1;
    const thisYear = new Date().getFullYear()+1900;

    const date = new Date(Date.UTC(2000, thisMonth - offset - 1, 1));

    return date.toLocaleString('en', { month: 'long' });
  };

  switch (selectedInterval.value) {
    case 'weekly':
      timeInterval = today.getTime() - 7 * 24 * 60 * 60 * 1000;
      title = 'Orders This Week';
      xaxis = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
      break;
    case 'monthly':
      timeInterval = today.getTime() - 30 * 24 * 60 * 60 * 1000;
      title = 'Orders This Month';
      xaxis = Array.from({length: 30}, (_, i) => i + 1);
      break;
    case 'quarterly':
      timeInterval = today.getTime() - 3 * 30 * 24 * 60 * 60 * 1000;
      title = 'Orders This Quarter';
      xaxis = Array.from({ length: 3 }, (_, i) => getMonthName(2-i));
      break;
    case 'halfYearly':
      timeInterval = today.getTime() - 6 * 30 * 24 * 60 * 60 * 1000;
      title = 'Orders last 6 months';
      xaxis = Array.from({ length: 6 }, (_, i) => getMonthName(5-i));
      break;
    case 'yearly':
      timeInterval = today.getTime() - 12 * 30 * 24 * 60 * 60 * 1000;
      title = 'Orders last 12 months';
      xaxis = Array.from({ length: 12 }, (_, i) => getMonthName(11-i));
      break;
    case 'all':
      timeInterval = today.getTime() - 74 * 12 * 30 * 24 * 60 * 60 * 1000;
      title = 'All Orders till date';
      xaxis = Array.from({ length: 74 }, (_, i) => getMonthName(73-i));
      break;
    case 'today':
    default:
      today.setHours(0, 0, 0, 0); // Set time to 00:00:00
      timeInterval = today.getTime(); // Start from today 12 AM
      title = 'Orders Today';
      xaxis = Array.from({ length: 24 }, (_, i) => `${i % 12 === 0 ? 12 : i % 12}${i < 12 ? 'AM' : 'PM'}`);
  }

  return {timeInterval, title, xaxis};
};

const getChartData = (interval, startTime) => {
  let data = new Map();
  
  const filteredOrders = orders.value.filter((order) => {
    if (new Date(order.orderDate).getTime() >= startTime) {
      let dateKey;
      switch (interval) {
        case 'weekly':
          dateKey = new Date(order.orderDate).toLocaleDateString('en-US', {weekday: 'short'});
          break;
        case 'monthly':
          dateKey = new Date(order.orderDate).getDate();
          break;
        case 'quarterly':
          dateKey = new Date(order.orderDate).toLocaleString('en-US', {month: 'long'});
          break;
        case 'halfYearly':
          dateKey = new Date(order.orderDate).toLocaleString('en-US', {month: 'long'});
          break;
        case 'yearly':
          dateKey = new Date(order.orderDate).toLocaleString('en-US', {month: 'long'});
          break;
        case 'all':
          dateKey = (new Date(order.orderDate).getFullYear()+1900) + '-' + (new Date(order.orderDate).getMonth() + 1);
          break;
        default:
          const hour = new Date(order.orderDate).getHours();
          dateKey = (hour % 12 == 0 ? 12 : hour % 12) + (hour < 12 ? 'AM' : 'PM');
          break;
      }
      if (!data.has(dateKey)) {
        data.set(dateKey, 0);
      }
      data.set(dateKey, data.get(dateKey) + 1);
      return true;
    }
  });

  return {data, filteredOrders};
};

const convertDataMapToArray = (data, keys) => {
  const results = [];
  keys.forEach((key) => {
    results.push(data.has(key) ? data.get(key) : 0);
  });
  return results;
};

// Add computed property for currentTheme
const currentTheme = computed(() => themeStore.getTheme);

watch(() => pendingOrders.value, () => {
  pendingOrdersLength.value = pendingOrders.value.length;
});

watch(() => lastPaymentDetails.value, () => {
  lastPaymentDetailsLength.value = lastPaymentDetails.value.length;
});

watch(() => orders.value, () => {
  updateOrdersData();
});

// Watch for changes in selectedInterval and update orders accordingly
watchEffect(() => {
  updateOrdersData();
});

onMounted(async () => {
  // Check if the flag is present in sessionStorage
  const dataFetched = sessionStorage.getItem("dataFetched");
  if (dataFetched === "false" || !dataFetched) {
    // Fetch from db api
    await allOrders();
    updateOrdersData();
    sessionStorage.setItem("dataFetched", "true");
  } else {
    // Get from session storage
    orders.value = orderStore.getOrders();
    updateOrdersData();
  }
});
</script>

<style scoped>
.dashboard {
  display: flex;
  flex-direction: column;
  padding: 24px;
  background-color: var(--background-color);
  min-height: calc(100vh - 150px);
  gap: 24px;
  color: var(--text-color);
  transition: background-color 0.3s ease, color 0.3s ease;
}

/* Dashboard Header */
.dashboard-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
}

.dashboard-title {
  font-size: 28px;
  font-weight: 700;
  color: var(--text-color);
  margin: 0;
  letter-spacing: -0.5px;
}

/* Dark mode text color overrides */
[data-theme="dark"] .dashboard,
[data-theme="dark"] .dashboard-title,
[data-theme="dark"] h1,
[data-theme="dark"] h2,
[data-theme="dark"] h3,
[data-theme="dark"] h4,
[data-theme="dark"] h5,
[data-theme="dark"] h6,
[data-theme="dark"] p,
[data-theme="dark"] span,
[data-theme="dark"] label,
[data-theme="dark"] .time-interval,
[data-theme="dark"] .metric-description {
    color: #ffffff !important;
}

[data-theme="dark"] select,
[data-theme="dark"] input {
    background-color: #1e1e1e !important;
    color: #ffffff !important;
    border-color: #404040 !important;
}

/* Metrics Cards */
.metrics-container {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 20px;
  width: 100%;
}

.metric-card {
  background-color: var(--background-color);
  border-radius: 12px;
  padding: 24px;
  box-shadow: 0 2px 4px rgba(10, 61, 10, 0.1);
  transition: all 0.3s ease;
  border: 1px solid #0a3d0a;
  position: relative;
  overflow: hidden;
}

.metric-card:hover {
  transform: translateY(-3px);
  box-shadow: 0 4px 8px rgba(10, 61, 10, 0.15);
  border-color: #072907;
}

.metric-title {
  font-size: 15px;
  color: #0a3d0a;  /* Dark green for card titles */
  margin-bottom: 8px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.metric-value {
  font-size: 32px;
  font-weight: 800;
  color: #072907;  /* Very dark green for metric values */
  margin-bottom: 4px;
  letter-spacing: -0.5px;
}

/* Dark mode specific styles */
[data-theme="dark"] .metric-card {
    background-color: #1e1e1e;
    border-color: #404040;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

[data-theme="dark"] .metric-card .metric-value {
    color: #ffffff !important;
}

.metric-change, .metric-description {
  font-size: 12px;
  display: flex;
  align-items: center;
  color: var(--text-muted);
}

.positive {
  color: var(--success);
}

.negative {
  color: var(--danger);
}

/* Charts */
.chart-card {
  background-color: var(--background-color);
  border-radius: 12px;
  padding: 24px;
  box-shadow: 0 2px 8px rgba(10, 61, 10, 0.1);
  width: 100%;
  border: 1px solid #0a3d0a;
}

.chart-title {
  font-size: 18px;
  color: #072907;
  margin-bottom: 20px;
  font-weight: 700;
  letter-spacing: -0.5px;
  text-transform: uppercase;
}

.main-chart {
  margin-bottom: 24px;
}

/* Lists */
.lists-container {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 20px;
  width: 100%;
}

.list-card {
  background-color: var(--background-color);
  border-radius: 12px;
  box-shadow: var(--shadow-sm);
  overflow: hidden;
  display: flex;
  flex-direction: column;
  transition: all 0.3s ease;
  border: 1px solid var(--border-color);
}

.list-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid var(--border-color);
  background-color: var(--background-color);
  transition: all 0.3s ease;
}

.list-title {
  font-size: 16px;
  font-weight: 700;
  color: #0a3d0a;  /* Dark green for list titles */
  margin: 0;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.view-all {
  font-size: 12px;
  color: var(--primary);
  text-decoration: none;
  font-weight: 500;
}

.badge {
  background-color: var(--primary);
  color: #ffffff;
  border-radius: 16px;
  padding: 4px 8px;
  font-size: 12px;
  font-weight: 600;
}

.list-body {
  padding: 0;
  max-height: 350px;
  overflow-y: auto;
  background-color: var(--background-color);
  box-shadow: inset 0 2px 4px rgba(10, 61, 10, 0.05);
}

.list-body p {
  margin: 12px 0;
  padding: 0 20px;
}

.list-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid var(--border-color);
  transition: all 0.3s ease;
}

.list-item:hover {
  background-color: var(--primary-focus);
}

.list-item-content {
  display: flex;
  flex-direction: column;
  gap: 8px;
  flex: 1;
  margin: 0 12px;
}

.customer-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
  align-items: flex-start;
}

.customer-name {
  font-weight: 600;
  color: #0a3d0a;  /* Dark green for customer names */
  font-size: 14px;
}

.customer-address {
  font-size: 12px;
  color: var(--text-muted);
}

.order-info {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 2px;
}

.order-date {
  font-size: 12px;
  color: var(--text-muted);
}

.status-badge {
  font-size: 11px;
  padding: 2px 8px;
  border-radius: var(--radius-sm);
  font-weight: 500;
}

.status-badge.pending {
  background-color: #fff3cd;
  color: #856404;
  border: 1px solid #ffeeba;
  font-weight: 600;
}

.status-badge.received {
  background-color: #d4edda;
  color: #155724;
  border: 1px solid #c3e6cb;
  font-weight: 600;
}

.list-item-link {
  color: var(--primary);
  text-decoration: none;
  font-size: 12px;
  font-weight: 500;
}

.view-details {
  padding: 4px 8px;
  border-radius: var(--radius-sm);
  background-color: var(--primary-focus);
  color: var(--primary);
  transition: background-color var(--transition-fast);
}

.view-details:hover {
  background-color: var(--primary);
  color: var(--primary-inverse);
}

/* Dark mode specific styles */
[data-theme="dark"] .status-badge.pending {
    background-color: #3a2f00;
    color: #ffe066;
    border: 1px solid #665200;
}

[data-theme="dark"] .status-badge.received {
    background-color: #0a3622;
    color: #8ce3b0;
    border: 1px solid #155724;
}

[data-theme="dark"] .chart-card,
[data-theme="dark"] .list-card {
    background-color: #1e1e1e;
    border-color: #404040;
    transition: all 0.3s ease;
}

[data-theme="dark"] .list-header {
    border-bottom-color: #404040;
    background-color: #1e1e1e;
    transition: all 0.3s ease;
}

[data-theme="dark"] .list-body {
    background-color: #1e1e1e;
    transition: background-color 0.3s ease;
}

[data-theme="dark"] .list-item {
    border-bottom-color: #404040;
    transition: all 0.3s ease;
}

/* Light mode specific styles */
[data-theme="light"] .chart-card,
[data-theme="light"] .list-card {
    background-color: var(--background-color);
    border-color: #e2e8f0;
    transition: all 0.3s ease;
}

[data-theme="light"] .list-header {
    border-bottom-color: #e2e8f0;
    background-color: var(--background-color);
    transition: all 0.3s ease;
}

[data-theme="light"] .list-body {
    background-color: var(--background-color);
    transition: background-color 0.3s ease;
}

[data-theme="light"] .list-item {
    border-bottom-color: #e2e8f0;
    transition: all 0.3s ease;
}

/* Responsive Design */
@media (max-width: 768px) {
  .dashboard {
    padding: 16px;
    gap: 16px;
  }
  
  .dashboard-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 16px;
  }
  
  .time-interval {
    width: 100%;
  }
  
  .lists-container {
    grid-template-columns: 1fr;
  }
}
</style>