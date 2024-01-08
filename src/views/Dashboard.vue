<template>
  <div>
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
    <div class="main-container grid">
      <div class="box-container">
        <div class="above-box">
          <h6>Recent Orders</h6>
          <div class="box">
            <ul>
              <li v-for="order in recentOrders" :key="order.sln">
                <p> {{order.customerName}} || <span> {{order.orderDate}} </span></p>
              </li>
            </ul>
          </div>
        </div>
        <div class="above-box">
          <h6>Pending Orders ({{pendingOrdersLength}})</h6>
          <div class="box">
            <ul>
              <li v-for="order in pendingOrders" :key="order.sln">
                <p> {{order.customerName}} || <span> {{order.orderDate}} </span></p>
              </li>
            </ul>
          </div>
        </div>
        <div class="above-box">
          <h6>Last Payment Details</h6>
          <div class="box">
            <ul>
              <li v-for="order in lastPaymentDetails" :key="order.sln">
                <p> {{order.customerName}} || <span> {{order.orderDate}} </span> || <span> {{order.status}} </span> </p>
              </li>
            </ul>
          </div>
        </div>
      </div>
      <div class="charts-container">
        <canvas ref="salesChart"></canvas>
      </div>
    </div>
<!--    <div>-->
<!--      <label for="dateRange">Select Date Range:</label>-->
<!--      <input type="date" v-model="startDate" />-->
<!--      <input type="date" v-model="endDate" />-->
<!--      <button @click="fetchSalesData">Fetch Sales Data</button>-->
<!--    </div>-->
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
.box-container {
  display: flex;
  justify-content: space-around;
  margin: 20px;
}

.above-box {
  text-align: center;
}

.box {
  border: 1px solid #ccc;
  padding: 10px;
  border-radius: 5px;
  margin: 10px;
  text-align: center;
}

label {
  font-weight: bold;
  margin-right: 10px;
}

input,
select,
button {
  margin-bottom: 10px;
}

.time-interval {
  display: flex;
  flex-direction: row;
  justify-content: center;
  margin-top: 10px;
}

.charts-container {
  border: #999999;
  border-style: dashed;
}

canvas {
  max-width: 100%;
  margin-top: 20px;
}
</style>
