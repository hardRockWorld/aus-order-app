<script setup>
// import the necessary modules from v-chart
import { ref, provide, onMounted } from 'vue';
import { use } from 'echarts/core';
import { CanvasRenderer } from "echarts/renderers";
import { BarChart } from 'echarts/charts';
import { TitleComponent, TooltipComponent, GridComponent } from 'echarts/components';
import Vchart, { THEME_KEY } from 'vue-echarts';

// DB imports
import { collection, query, getDocs, orderBy, updateDoc, doc } from "firebase/firestore";
import { db } from '../fb.js';

use([
  CanvasRenderer,
  BarChart,
  TitleComponent,
  TooltipComponent,
  GridComponent
]);

provide(THEME_KEY, "dark");

const option = ref({
  title: {
    text: 'Highest Sales',
    left: 'center',
    top: '2%',
    textStyle: {
      fontSize: window.innerWidth < 480 ? 14 : window.innerWidth < 768 ? 16 : 18,
      fontWeight: 'bold'
    }
  },
  tooltip: {
    trigger: 'axis',
    axisPointer: {
      type: 'shadow'
    },
    formatter: function (params) {
      return `<strong>${params[0].name}</strong><br/>Quantity: ${params[0].value}`;
    },
    backgroundColor: 'rgba(50, 50, 50, 0.9)',
    borderColor: '#777',
    borderWidth: 1,
    textStyle: {
      color: '#fff',
      fontSize: window.innerWidth < 480 ? 12 : 14
    },
    padding: [8, 12],
    extraCssText: 'border-radius: 6px; box-shadow: 0 2px 8px rgba(0,0,0,0.2);'
  },
  grid: {
    left: window.innerWidth < 480 ? '8%' : window.innerWidth < 768 ? '6%' : '5%',
    right: window.innerWidth < 480 ? '8%' : window.innerWidth < 768 ? '6%' : '4%',
    bottom: window.innerWidth < 480 ? '8%' : '6%',
    top: window.innerWidth < 480 ? '15%' : '12%',
    containLabel: true
  },
  xAxis: {
    type: 'category',
    data: [],
    axisLabel: {
      show: false
    },
    axisLine: {
      lineStyle: {
        color: '#ccc'
      }
    }
  },
  yAxis: {
    type: 'value',
    name: 'Quantity Sold',
    nameTextStyle: {
      fontSize: window.innerWidth < 480 ? 11 : window.innerWidth < 768 ? 12 : 14,
      color: '#666'
    },
    axisLabel: {
      fontSize: window.innerWidth < 480 ? 10 : window.innerWidth < 768 ? 11 : 12,
      color: '#666'
    },
    axisLine: {
      lineStyle: {
        color: '#ccc'
      }
    },
    splitLine: {
      lineStyle: {
        color: '#eee',
        type: 'dashed'
      }
    }
  },
  series: [
    {
      name: 'Sales',
      type: 'bar',
      data: [],
      barWidth: window.innerWidth < 480 ? '60%' : window.innerWidth < 768 ? '50%' : '40%',
      itemStyle: {
        color: function(params) {
          const colors = ['#5470c6', '#91cc75', '#fac858', '#ee6666', '#73c0de', '#3ba272', '#fc8452', '#9a60b4', '#ea7ccc'];
          return colors[params.dataIndex % colors.length];
        },
        borderRadius: [4, 4, 0, 0]
      },
      emphasis: {
        itemStyle: {
          shadowBlur: 10,
          shadowOffsetX: 0,
          shadowColor: 'rgba(0, 0, 0, 0.3)',
          borderRadius: [6, 6, 0, 0]
        },
      },
      animationDuration: 1000,
      animationEasing: 'cubicOut'
    },
  ],
  responsive: true
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
    option.value.xAxis.data = topProducts.map(product => product.name);
    option.value.series[0].data = topProducts.map(product => ({ value: product.qty, name: product.name }));
  } catch (error) {
    console.error('Error fetching data:', error);
  }
}

// Function to update chart responsive options
const updateChartResponsive = () => {
  const width = window.innerWidth;
  
  // Update title font size
  option.value.title.textStyle.fontSize = width < 480 ? 14 : width < 768 ? 16 : 18;
  
  // Update tooltip font size
  option.value.tooltip.textStyle.fontSize = width < 480 ? 12 : 14;
  
  // Update grid margins
  option.value.grid.left = width < 480 ? '8%' : width < 768 ? '6%' : '5%';
  option.value.grid.right = width < 480 ? '8%' : width < 768 ? '6%' : '4%';
  option.value.grid.bottom = width < 480 ? '8%' : '6%';
  option.value.grid.top = width < 480 ? '15%' : '12%';
  
  // Update y-axis font sizes
  option.value.yAxis.nameTextStyle.fontSize = width < 480 ? 11 : width < 768 ? 12 : 14;
  option.value.yAxis.axisLabel.fontSize = width < 480 ? 10 : width < 768 ? 11 : 12;
  
  // Update bar width
  option.value.series[0].barWidth = width < 480 ? '60%' : width < 768 ? '50%' : '40%';
};

onMounted(() => {
  getTopOrderedProducts(selectedValue.value);
  
  // Add resize listener for responsive updates
  window.addEventListener('resize', updateChartResponsive);
});

// Clean up resize listener
import { onUnmounted } from 'vue';
onUnmounted(() => {
  window.removeEventListener('resize', updateChartResponsive);
});
</script>

<template>
  <div class="analysis-container">
    <div class="header-section">
      <h2 class="page-title">Sales Analysis</h2>
      <div class="controls-wrapper">
        <label for="top-sales-select" class="control-label">Top Selling Products</label>
        <select id="top-sales-select" v-model="selectedValue" @change="getTopOrderedProducts(selectedValue)" class="product-select">
          <option value="5">Top 5 Products</option>
          <option value="10">Top 10 Products</option>
          <option value="20">Top 20 Products</option>
          <option value="30">Top 30 Products</option>
        </select>
      </div>
    </div>
    <div class="chart-wrapper">
      <v-chart class="chart" :option="option" autoresize/>
    </div>
  </div>
</template>

<style scoped>
/* Main container */
.analysis-container {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding: 1rem;
  max-width: 100%;
  box-sizing: border-box;
}

/* Header section */
.header-section {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.page-title {
  font-size: 1.5rem;
  font-weight: bold;
  margin: 0;
  color: #072907;
  text-align: center;
}

/* Controls wrapper */
.controls-wrapper {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  align-items: center;
}

.control-label {
  font-size: 1.1rem;
  font-weight: 600;
  margin: 0;
  color: #072907;
  text-align: center;
}

.product-select {
  background-color: var(--background-color);
  border: 1px solid #0a3d0a;
  padding: 10px 16px;
  border-radius: 8px;
  font-size: 14px;
  color: #072907;
  cursor: pointer;
  min-width: 160px;
  transition: all 0.3s ease;
}

.product-select:focus {
  outline: none;
  border-color: #072907;
  box-shadow: 0 0 0 2px rgba(10, 61, 10, 0.1);
}

/* Chart wrapper */
.chart-wrapper {
  width: 100%;
  overflow: hidden;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  background-color: var(--background-color);
}

.chart {
  width: 100%;
  height: 400px;
  min-height: 300px;
}

/* Dark theme styles */
[data-theme="dark"] .page-title {
  color: #ffffff !important;
}

[data-theme="dark"] .control-label {
  color: #ffffff !important;
}

[data-theme="dark"] .product-select {
  background-color: #1e1e1e !important;
  color: #ffffff !important;
  border-color: #404040 !important;
}

[data-theme="dark"] .product-select:focus {
  border-color: #606060 !important;
  box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.1);
}

[data-theme="dark"] .product-select option {
  background-color: #1e1e1e;
  color: #ffffff;
}

[data-theme="dark"] .chart-wrapper {
  background-color: #1e1e1e !important;
  box-shadow: 0 2px 8px rgba(255, 255, 255, 0.1);
}

/* Responsive breakpoints */

/* Small mobile devices (320px to 480px) */
@media (max-width: 480px) {
  .analysis-container {
    padding: 0.75rem;
    gap: 0.75rem;
  }
  
  .page-title {
    font-size: 1.25rem;
  }
  
  .control-label {
    font-size: 1rem;
  }
  
  .product-select {
    padding: 8px 12px;
    font-size: 13px;
    min-width: 140px;
  }
  
  .chart {
    height: 300px;
    min-height: 250px;
  }
}

/* Medium mobile devices (481px to 768px) */
@media (min-width: 481px) and (max-width: 768px) {
  .analysis-container {
    padding: 1rem;
  }
  
  .controls-wrapper {
    flex-direction: row;
    justify-content: center;
    align-items: center;
    gap: 1rem;
  }
  
  .chart {
    height: 350px;
  }
}

/* Tablets (769px to 1024px) */
@media (min-width: 769px) and (max-width: 1024px) {
  .analysis-container {
    padding: 1.5rem;
  }
  
  .controls-wrapper {
    flex-direction: row;
    justify-content: center;
    align-items: center;
    gap: 1.5rem;
  }
  
  .page-title {
    font-size: 1.75rem;
  }
  
  .control-label {
    font-size: 1.2rem;
  }
  
  .chart {
    height: 450px;
  }
}

/* Small laptops and large tablets (1025px to 1366px) */
@media (min-width: 1025px) and (max-width: 1366px) {
  .analysis-container {
    padding: 2rem;
    max-width: 1200px;
    margin: 0 auto;
  }
  
  .controls-wrapper {
    flex-direction: row;
    justify-content: center;
    align-items: center;
    gap: 2rem;
  }
  
  .page-title {
    font-size: 2rem;
  }
  
  .control-label {
    font-size: 1.3rem;
  }
  
  .product-select {
    padding: 12px 18px;
    font-size: 15px;
    min-width: 180px;
  }
  
  .chart {
    height: 500px;
  }
}

/* Large screens and desktops (1367px and up) */
@media (min-width: 1367px) {
  .analysis-container {
    padding: 2.5rem;
    max-width: 1400px;
    margin: 0 auto;
  }
  
  .controls-wrapper {
    flex-direction: row;
    justify-content: center;
    align-items: center;
    gap: 2.5rem;
  }
  
  .page-title {
    font-size: 2.25rem;
  }
  
  .control-label {
    font-size: 1.4rem;
  }
  
  .product-select {
    padding: 14px 20px;
    font-size: 16px;
    min-width: 200px;
  }
  
  .chart {
    height: 600px;
  }
}

/* Ultra-wide screens (1920px and up) */
@media (min-width: 1920px) {
  .analysis-container {
    max-width: 1600px;
    padding: 3rem;
  }
  
  .chart {
    height: 700px;
  }
}

/* Landscape orientation adjustments for mobile */
@media (max-height: 500px) and (orientation: landscape) {
  .chart {
    height: 250px;
    min-height: 200px;
  }
  
  .analysis-container {
    padding: 0.5rem;
    gap: 0.5rem;
  }
  
  .page-title {
    font-size: 1.1rem;
  }
  
  .control-label {
    font-size: 0.9rem;
  }
}

/* High DPI display adjustments */
@media (-webkit-min-device-pixel-ratio: 2), (min-resolution: 192dpi) {
  .chart-wrapper {
    box-shadow: 0 1px 4px rgba(0, 0, 0, 0.15);
  }
}

/* Accessibility improvements */
@media (prefers-reduced-motion: reduce) {
  .product-select {
    transition: none;
  }
}

/* Focus styles for keyboard navigation */
.product-select:focus-visible {
  outline: 2px solid #072907;
  outline-offset: 2px;
}

[data-theme="dark"] .product-select:focus-visible {
  outline-color: #ffffff;
}
</style>
