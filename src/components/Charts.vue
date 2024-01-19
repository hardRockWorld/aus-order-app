<script setup>
// import the necessary modules from v-chart
import {ref, watch, onMounted, provide, computed } from 'vue';
import { use } from 'echarts/core';
import { CanvasRenderer } from "echarts/renderers";
import { LineChart, BarChart } from 'echarts/charts';
import { TitleComponent, TooltipComponent, LegendComponent, GridComponent } from 'echarts/components';
import VChart, { THEME_KEY } from 'vue-echarts';
import 'echarts';

import { useSessionStore } from "@/stores/userSessionStore";
import { useOrderStore } from "@/stores/orderSessionStore";

const sessionStore = useSessionStore();
const orderStore = useOrderStore();

const props = defineProps({
  allData: {
    type: Array,
    required: true,
  },
  chartTitle: {
    type: String,
    required: true,
  },
  xAxisData: {
    type: Array,
    required: true,
  },
//   pendingData: {
//     type: Array,
//     required: true,
//   },
//   paymentData: {
//     type: Array,
//     required: true,
//   },
  selectedInterval: {
    type: String,
    required: true,
  },
});

// Define the props here
const allData = props.allData;
const chartTitle = props.chartTitle;
const xAxisData = props.xAxisData;
const selectedInterval = props.selectedInterval;

console.log('this is props allData: ', allData);
console.log('this is the props chart title: ', chartTitle);
console.log('this is for xAxis data: ', xAxisData);

use([
  CanvasRenderer,
  LineChart,
  BarChart,
  TitleComponent,
  TooltipComponent,
  LegendComponent,
  GridComponent
]);

provide(THEME_KEY, "dark");

const chartOptions = ref({});
const chartRef = ref(null);
const thisMonth = new Date().getMonth()+1;
const getMonthName = (offset) => {
  const date = new Date(Date.UTC(2000, thisMonth - offset - 1, 1));
  return date.toLocaleString('en', { month: 'long' });
};
const thisYear = new Date().getFullYear()+1900;

watch(props, (newProps) => {
  chartOptions.value = {
    // Options for weekly chart
    title: { text: newProps.chartTitle },
    xAxis: { data: newProps.xAxisData },
    yAxis: { type: 'value' },
    chartWidth: "100%",
    chartHeight: "550px",
    series: [
      {
        data: newProps.allData, // Example data for week
        type: 'bar',
      },
    ],
  };
});

// Watch the selected interval value and make the chart options accordingly
watch(
    () => selectedInterval,
    (newInterval) => {
        console.log('this is the new interval: ', newInterval);
      switch (newInterval) {
        case 'weekly':
          chartOptions.value = {
            // Options for weekly chart
            title: { text: chartTitle },
            xAxis: { data: xAxisData },
            yAxis: { type: 'value' },
            chartWidth: "100%",
            chartHeight: "550px",
            series: [
              {
                data: allData, // Example data for week
                type: 'bar',
              },
            ],
          };
          break;
          // Add cases for other intervals as needed
        case 'monthly':
          chartOptions.value = {
            // Options for monthly chart
            title: { text: chartTitle },
            xAxis: { data: xAxisData },
            yAxis: { type: 'value' },
            chartWidth: "100%",
            chartHeight: "550px",
            series: [
              {
                data: allData, // Example data for week
                type: 'bar',
              },
            ],
          };
          break;
        case 'quarterly':
          chartOptions.value = {
            // Options for quarterly chart
            title: { text: chartTitle },
            xAxis: { data: xAxisData },
            yAxis: { type: 'value' },
            chartWidth: "100%",
            chartHeight: "550px",
            series: [
              {
                data: allData, // Example data for week
                type: 'bar',
              },
            ],
          };
          break;
        case 'halfYearly':
          chartOptions.value = {
            // Options for halfYearly chart
            title: { text: chartTitle },
            xAxis: { data: xAxisData },
            yAxis: { type: 'value' },
            chartWidth: "100%",
            chartHeight: "550px",
            series: [
              {
                data: allData, // Example data for week
                type: 'bar',
              },
            ],
          };
          break;
        case 'yearly':
          chartOptions.value = {
            // Options for yearly chart
            title: { text: chartTitle },
            xAxis: { data: xAxisData },
            yAxis: { type: 'value' },
            chartWidth: "100%",
            chartHeight: "550px",
            series: [
              {
                data: allData, // Example data for week
                type: 'bar',
              },
            ],
          };
          break;
        case 'all':
          chartOptions.value = {
            // Options for All chart
            title: { text: chartTitle },
            xAxis: { data: xAxisData },
            yAxis: { type: 'value' },
            chartWidth: "100%",
            chartHeight: "550px",
            series: [
              {
                data: allData, // Example data for week
                type: 'bar',
              },
            ],
          };
          break;
        default:
          chartOptions.value = {
              // Options for today's chart
              title: { text: chartTitle },
              xAxis: { data: xAxisData },
              yAxis: { type: 'value' },
              chartWidth: "100%",
              chartHeight: "550px",
              series: [
                {
                  data: allData, // Example data for today
                  type: 'bar',
                },
              ],
            };
      }
    },
    { immediate: true }
);

// OnMounted code
onMounted(() => {
  // Set chart options here after the component is mounted
  chartRef.value.setOption(chartOptions.value);
});

// Use watch to wait for changes in chartOptions
watch(chartOptions, () => {
  // Update the chart when chartOptions change
  if (chartRef.value) {
    chartRef.value.setOption(chartOptions.value);
  }
});

// Use a flag to check if the DOM is fully loaded
const isDOMLoaded = ref(false);

// Use a callback for window.onload to set the flag
window.onload = () => {
  isDOMLoaded.value = true;
};
</script>

<template>
  <div>
    <v-chart ref="chartRef" class="chart-render" :option="chartOptions" :autoresize="true" />
  </div>
</template>

<style scoped>
.chart-render {
  width: 800px;
  height: 500px;
}
</style>