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
                <router-link :to="{ name: 'currentOrder', params: { sln: order.sln } }">
                    <p>{{order.customerName}} || {{order.customerAddress}} || <span>{{getFormattedDate(new Date(order.orderDate), false)}}</span></p>
                </router-link>
            </li>
          </ul>
        </div>
      </div>
      <div class="pending-orders grid">
        <div class="list box">
          <h6>Pending Orders ({{pendingOrdersLength}})</h6>
          <ul>
            <li v-for="order in pendingOrders" :key="order.sln">
                <router-link :to="{ name: 'currentOrder', params: { sln: order.sln } }">
                    <p>{{order.customerName}} || {{order.customerAddress}} || <span>{{getFormattedDate(new Date(order.orderDate), false)}}</span></p>
                </router-link>
            </li>
          </ul>
        </div>
      </div>
      <div class="last-payment-details grid">
        <div class="list box">
          <h6>Last Payment Details ({{lastPaymentDetailsLength}})</h6>
          <ul>
            <li v-for="order in lastPaymentDetails" :key="order.sln">
                <router-link :to="{ name: 'currentOrder', params: { sln: order.sln } }">
                    <p>{{order.customerName}} || {{order.customerAddress}} || <span>{{getFormattedDate(new Date(order.orderDate), false)}}</span> || <span>{{order.status}}</span></p>
                </router-link>
            </li>
          </ul>
        </div>
      </div>
    </div>

    <div class="charts-container grid-group">
      <div class="recent-orders grid">
        <div class="chart box">
          <charts :allData="chartData" :chartTitle="chartTitle" :xAxisData="xAxis" :selectedInterval="selectedInterval" />
        </div>
      </div>
      <!-- <div class="pending-orders grid">
        <div class="chart box">
          <Charts :all-data="allChartData()" :pending-data="pendingChartData()" :payment-data="paymentChartData()" :selectedInterval="selectedInterval"/>
        </div>
      </div>
      <div class="last-payment-details grid">
        <div class="chart box">
          <Charts :all-data="allChartData()" :pending-data="pendingChartData()" :payment-data="paymentChartData()" :selectedInterval="selectedInterval"/>
        </div>
      </div> -->
    </div>
  </div>
</template>

<script setup>
import { onMounted, ref, watch, watchEffect } from 'vue';
import { useSessionStore } from "@/stores/userSessionStore";
import { useOrderStore } from "@/stores/orderSessionStore";
import { fetchAllOrders } from "@/dbQueries";
import Charts from "@/components/Charts.vue";
import { getFormattedDate } from '@/util/util';

const sessionStore = useSessionStore();
const orderStore = useOrderStore();

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

// Today's Date
const today = new Date();

// Fetch all orders
const allOrders = async () => {
  orders.value = await fetchAllOrders();
  orderStore.saveOrders(orders.value);
};

// Update the orders data
const updateOrdersData = () => {
  const {timeInterval, title, xaxis} = getStartDate();

  chartTitle.value = title;
  xAxis.value = xaxis;

  // Clear the chartData
  const {data, filteredOrders} = getChartData(selectedInterval.value, timeInterval);
  chartData.value = convertDataMapToArray(data, xaxis);

  recentOrders.value = orders.value.slice(0, 5);
  pendingOrders.value = orders.value.filter(
      item => {
        return (new Date(item.orderDate).getTime() >= timeInterval) && (item.status === 'placed')
      }
  );
  lastPaymentDetails.value = orders.value.filter(
      item => {
        return (new Date(item.orderDate).getTime() >= timeInterval) && (item.status === 'recieved')
      }
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
      xaxis = Array.from({ length: 3 }, (_, i) => getMonthName(2-i));  //['november', 'december', 'january']
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
      timeInterval = today.getTime() - 24 * 60 * 60 * 1000;
      title = 'Orders Today';
      xaxis = [
        '12AM', '1AM', '2AM', '3AM', '4AM', '5AM', '6AM', '7AM', '8AM', '9AM', '10AM', '11AM',
        '12PM', '1PM', '2PM', '3PM', '4PM', '5PM', '6AM', '7PM', '8PM', '9PM', '10PM', '11PM',
      ];
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


// Prepare all chart data
const allChartData = () => {
  return chartData.value;
};

// Prepare pending orders chart data
const pendingChartData = () => {
  return pendingOrders.value;
}

// Prepare last payment chart data
const paymentChartData = () => {
  return lastPaymentDetails.value;
}

// Watch for changes in selectedInterval and update orders accordingly
watchEffect( () => {
  updateOrdersData();
});

// // Watch for changes in startDate and endDate and fetch sales data accordingly
// watch([startDate, endDate], () => {
//   fetchSalesData();
// });

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
  margin-bottom: 5%;
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