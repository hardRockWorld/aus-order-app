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
          <h6>Last Payment Details ({{lastPaymentDetailsLength}})</h6>
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
import { onMounted, ref, watch, watchEffect } from 'vue';
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
const lastPaymentDetailsLength = ref(0);
const startDate = ref('');
const endDate = ref('');
const selectedInterval = ref('today');

// Today's Date
const today = new Date();

// Fetch all orders
const allOrders = async () => {
  orders.value = await fetchAllOrders();
  orderStore.saveOrders(orders.value);
};

// Update the orders data
const updateOrdersData = () => {
  const timeInterval = getStartDate();

  recentOrders.value = orders.value.slice(0, 5);
  pendingOrders.value = orders.value.filter(
      item => {
        return (new Date(item.orderDate) >= timeInterval) && (item.status === 'placed')
      }
  );
  lastPaymentDetails.value = orders.value.filter(
      item => {
        return (new Date(item.orderDate) >= timeInterval) && (item.status === 'recieved')
      }
  );

  pendingOrdersLength.value = pendingOrders.value.length;
  lastPaymentDetailsLength.value = lastPaymentDetails.value.length;
};

// Get start date based on the selected interval
const getStartDate = () => {
  let result;
  switch (selectedInterval.value) {
    case 'today':
      result = today.getTime() - 24 * 60 * 60 * 1000;
      break;
    case 'weekly':
      result = today.getTime() - 7 * 24 * 60 * 60 * 1000;
      break;
    case 'monthly':
      result = today.getTime() - 30 * 24 * 60 * 60 * 1000;
      break;
    case 'quarterly':
      result = today.getTime() - 3 * 30 * 24 * 60 * 60 * 1000;
      break;
    case 'halfYearly':
      result = today.getTime() - 6 * 30 * 24 * 60 * 60 * 1000;
      break;
    case 'yearly':
      result = today.getTime() - 12 * 30 * 24 * 60 * 60 * 1000;
      break;
    case 'all':
      result = today.getTime() - 74 * 12 * 30 * 24 * 60 * 60 * 1000;
      break;
    default:
      result = today.getTime() - 24 * 60 * 60 * 1000;
  }
  console.log("start date will be: ", new Date(result));
  return result;
};

watch(() => pendingOrders.value, () => {
  pendingOrdersLength.value = pendingOrders.value.length;
});

watch(() => lastPaymentDetails.value, () => {
  lastPaymentDetailsLength.value = lastPaymentDetails.value.length;
});

watch(() => orders.value, () => {
  updateOrdersData();
});

// const fetchSalesData = async () => {
// Implement logic to fetch sales data based on date range
// };
//
// TODO: Using vue-chartjs make charts and graphs and then map that to the orders data
// const updateChartData = () => {
// Implement logic to update chart data based on selected time interval
// };

// Watch for changes in selectedInterval and update orders accordingly
watchEffect( () => {
  updateOrdersData();
});

// // Watch for changes in startDate and endDate and fetch sales data accordingly
// watch([startDate, endDate], () => {
//   fetchSalesData();
// });

onMounted(async () => {
  // Initialize chart on component mount
  // this.updateChartData();

  // Check if the flag is present in sessionStorage
  const dataFetched = sessionStorage.getItem('dataFetched');
  if (!dataFetched) {
    // Fetch from db api
    console.log('Fetch from db api');
    await allOrders();
    updateOrdersData();
    sessionStorage.setItem('dataFetched', 'true');
  } else {
    // Get from session storage
    console.log('Get from session storage');
    orders.value = orderStore.getOrders();
    updateOrdersData();
  }
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

.list {
  display: flex;
  flex-direction: column;
  text-align: left;
  gap: 10px;
}

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
