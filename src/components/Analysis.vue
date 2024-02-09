<script setup>
// import the necessary modules from v-chart
import { ref, provide, onMounted } from 'vue';
import { use } from 'echarts/core';
import { CanvasRenderer } from "echarts/renderers";
import { PieChart } from 'echarts/charts';
import { TitleComponent, TooltipComponent, LegendComponent } from 'echarts/components';
import Vchart, { THEME_KEY } from 'vue-echarts';

// DB imports
import { collection, query, getDocs, orderBy, updateDoc, doc } from "firebase/firestore";
import { db } from '../fb.js';

use([
  CanvasRenderer,
  PieChart,
  TitleComponent,
  TooltipComponent,
  LegendComponent
]);

provide(THEME_KEY, "dark");

const option = ref({
  title: {
    text: 'Highest Sales',
    left: 'center',
  },
  tooltip: {
    trigger: 'item',
    formatter: '{a} <br/>{b} : {c} ({d}%)',
  },
  legend: {
    orient: 'vertical',
    left: 'left',
    data: [],
  },
  series: [
    {
      name: 'Highest Sales',
      type: 'pie',
      radius: '75%',
      center: ['50%', '55%'],
      data: [],
      emphasis: {
        itemStyle: {
          shadowBlur: 10,
          shadowOffsetX: 0,
          shadowColor: 'rgba(0, 0, 0, 0.5)',
        },
      },
    },
  ],
});

const selectedValue = ref(5);
const ordersCalculate = ref([]);
let topProducts = ref([]);

// watchOnMounted(selectedValue, (newValue) => {
//   getTopOrderedProducts(newValue);
// });

// // Call the function immediately to populate the chart on page load
// getTopOrderedProducts(selectedValue);

// for DB operation
const q = query(collection(db, "orders"));

async function getTopOrderedProducts(numProducts) {
  try {
    const ordersSnapshot = await getDocs(q);

    // Iterate through each order
    ordersSnapshot.forEach((orderDoc) => {
      const orderData = orderDoc.data();

      // Iterate through products in the order
      orderData.items.forEach((item) => {
        const itemName = item.name;
        const itemQuantity = Number(item.qty);

         // Check if the item already exists in ordersCalculate
        const existingItemIndex = ordersCalculate.value.findIndex(item => item.name === itemName);

        if (existingItemIndex !== -1) {
          // Item already exists, update the quantity
          ordersCalculate.value = ordersCalculate.value.reduce((updatedArray, existingItem) => {
            if (existingItem.name === itemName) {
              existingItem.qty += itemQuantity;
            }
            updatedArray.push(existingItem);
            return updatedArray;
          }, []);
        } else {
          // Item doesn't exist, add a new entry
          ordersCalculate.value.push({ name: itemName, qty: itemQuantity });
        }
      });
    });

    // After populating ordersCalculate, sort it
    ordersCalculate.value.sort((a, b) => b.qty - a.qty);

    // After sorting, console log the first 5 items
    topProducts = ordersCalculate.value.slice(0, numProducts);

    // Update the chart options
    option.value.series[0].data = topProducts.map(product => ({ value: product.qty, name: product.name }));
    option.value.legend.data = topProducts.map(product => product.name);
  } catch (error) {
    console.error('Error fetching data:', error);
  }
}

onMounted(() => {
  getTopOrderedProducts(selectedValue.value);
});
</script>

<template>
  <div>
    <label for="top-sales-select">Top Selling Products</label>

    <select id="top-sales-select" v-model="selectedValue" @change="getTopOrderedProducts(selectedValue)">
      <option value="5">5 Top Products</option>
      <option value="10">10 Top Products</option>
      <option value="20">20 Top Products</option>
      <option value="30">30 Top Products</option>
    </select>
  </div>
	<v-chart class="chart" :option="option" autoresize/>
</template>

<style scoped>
.chart {
  width: 100%; /* Full width */
  height: 50vh; /* 50% of the viewport height */
  align-items: center;
}

label {
  font-size: 1.4rem;
  font-weight: bold;
  margin-bottom: 1rem;
}
</style>
