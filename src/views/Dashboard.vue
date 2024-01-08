<template>
  <div class="dashboard">
    <div class="time-interval">
      <label for="timeInterval">Select Time Interval:</label>
      <select v-model="selectedInterval">
        <option value="today">Today</option>
        <option value="weekly">Weekly</option>
        <option value="monthly">Monthly</option>
        <option value="quarterly">Quarterly</option>
        <option value="halfYearly">Half-Yearly</option>
        <option value="yearly">Yearly</option>
        <option value="all">All</option>
      </select>
    </div>
    <div class="box-container grid-group">
      <div class="recent-orders grid">
        <div class="list box">
          <h6>Recent Orders</h6>
          <ul>
            <li v-for="order in recentOrders" :key="order.sln">
              <p>{{order.customerName}} || <span>{{order.orderDate}}</span></p>
            </li>
          </ul>
        </div>
      </div>
      <div class="pending-orders grid">
        <div class="list box">
          <h6>Pending Orders ({{pendingOrdersLength}})</h6>
          <ul>
            <li v-for="order in pendingOrders" :key="order.sln">
              <p>{{order.customerName}} || <span>{{order.orderDate}}</span></p>
            </li>
          </ul>
        </div>
      </div>
      <div class="last-payment-details grid">
        <div class="list box">
          <h6>Last Payment Details</h6>
          <ul>
            <li v-for="order in lastPaymentDetails" :key="order.sln">
              <p>{{order.customerName}} || <span>{{order.orderDate}}</span> || <span>{{order.status}}</span></p>
            </li>
          </ul>
        </div>
      </div>
    </div>

    <div class="charts-container grid-group">
      <div class="recent-orders grid">
        <div class="chart box">[chart]</div>
      </div>
      <div class="pending-orders grid">
        <div class="chart box">[chart]</div>
      </div>
      <div class="last-payment-details grid">
        <div class="chart box">[chart]</div>
      </div>
    </div>
  </div>
</template>

<script setup>
import {onMounted, ref, watch} from 'vue';
import { useSessionStore } from "@/stores/userSessionStore";
import { useOrderStore } from "@/stores/orderSessionStore";
import { fetchAllOrders } from "@/dbQueries";

const sessionStore = useSessionStore();
const orderStore = useOrderStore();

const orders = ref([]);
const pendingOrdersLength = ref(0);
const recentOrders = ref([]);
const pendingOrders = ref([]);
const lastPaymentDetails = ref([]);
const startDate = ref('');
const endDate = ref('');
const selectedInterval = ref('today');

// Fetch all orders
const allOrders = async () => {
  orders.value = await fetchAllOrders();
  orderStore.saveOrders(orders.value);
};

watch(() => pendingOrders.value, () => {
  pendingOrdersLength.value = pendingOrders.value.length;
});

const fetchSalesData = async () => {
  // Implement logic to fetch sales data based on date range
};

const updateChartData = () => {
  // Implement logic to update chart data based on selected time interval
};

// Watch for changes in selectedInterval and update chart accordingly
watch(selectedInterval, () => {
  updateChartData();
});

// Watch for changes in startDate and endDate and fetch sales data accordingly
watch([startDate, endDate], () => {
  fetchSalesData();
});

onMounted(async () => {
  // Initialize chart on component mount
  // this.updateChartData();

  // Check if the flag is present in sessionStorage
  const dataFetched = sessionStorage.getItem('dataFetched');
  if (!dataFetched) {
    // Fetch from db api
    console.log('Fetch from db api');
    await allOrders();
    sessionStorage.setItem('dataFetched', 'true');
  } else {
    // Get from session storage
    console.log('Get from session storage');
    orders.value = orderStore.getOrders();
  }
  recentOrders.value = orders.value.slice(0, 5);
  pendingOrders.value = orders.value.filter(item => item.status  === 'placed');
  lastPaymentDetails.value = orders.value.filter(item => item.status === 'recieved');
});


</script>

<style scoped>
/* Add your styling here */

.time-interval {
  text-align: center;
  width: fit-content;
  margin-top: 10px;
}

.dashboard {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.box-container {
  display: flex;
  flex-direction: row;
  gap: 20px;
}

.charts-container {
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  gap: 20px;
  margin: 3% 1% 3% 1%;
}

.box {
  border: 1px solid #ccc;
  padding: 10px;
  border-radius: 5px;
  text-align: center;
  flex-grow: 1; /* Allow the box to grow and take available space */
}

.list,
.chart {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

select {
  border: 1px solid #ccc;
  padding: 5px;
  text-align: center;
}
</style>
