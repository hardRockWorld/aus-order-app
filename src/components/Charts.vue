<script setup>
// import the necessary modules from v-chart
import {ref, watch, onMounted, provide, computed, nextTick } from 'vue';
import { use } from 'echarts/core';
import { CanvasRenderer } from "echarts/renderers";
import { LineChart, BarChart, PieChart } from 'echarts/charts';
import { 
  TitleComponent, 
  TooltipComponent, 
  LegendComponent, 
  GridComponent,
  ToolboxComponent,
  DataZoomComponent,
  GraphicComponent
} from 'echarts/components';
import VChart, { THEME_KEY } from 'vue-echarts';
import 'echarts';

import { useSessionStore } from "@/stores/userSessionStore";
import { useOrderStore } from "@/stores/orderSessionStore";
import { useThemeStore } from "@/stores/themeStore";

const chartRef = ref(null);
const isLoading = ref(true);
const sessionStore = useSessionStore();
const orderStore = useOrderStore();
const themeStore = useThemeStore();
const currentTheme = computed(() => themeStore.isDark);

// Props definition
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
  selectedInterval: {
    type: String,
    required: true,
  }
});

use([
  CanvasRenderer,
  LineChart,
  BarChart,
  PieChart,
  TitleComponent,
  TooltipComponent,
  LegendComponent,
  GridComponent,
  ToolboxComponent,
  DataZoomComponent,
  GraphicComponent
]);

provide(THEME_KEY, "light");

// Single computed property for chart options
const chartOptions = computed(() => ({
  title: {
    text: props.chartTitle,
    textStyle: {
      fontSize: 16,
      fontWeight: 600,
      color: currentTheme.value ? '#ffffff' : '#333333'
    },
    left: 'center'
  },
  tooltip: {
    trigger: 'axis',
    backgroundColor: currentTheme.value ? '#2a2a2a' : '#ffffff',
    borderColor: currentTheme.value ? '#404040' : '#d1d5db',
    textStyle: {
      color: currentTheme.value ? '#ffffff' : '#333333'
    }
  },
  xAxis: {
    type: 'category',
    data: props.xAxisData,
    axisLabel: {
      color: currentTheme.value ? '#ffffff' : '#333333',
      rotate: props.xAxisData.length > 12 ? 45 : 0,
      interval: props.xAxisData.length > 24 ? 'auto' : 0
    },
    axisLine: {
      lineStyle: {
        color: currentTheme.value ? '#404040' : '#666666'
      }
    }
  },
  yAxis: {
    type: 'value',
    axisLabel: {
      color: currentTheme.value ? '#ffffff' : '#333333'
    },
    axisLine: {
      lineStyle: {
        color: currentTheme.value ? '#404040' : '#666666'
      }
    },
    splitLine: {
      lineStyle: {
        color: currentTheme.value ? '#333333' : '#e6e6e6'
      }
    }
  },
  grid: {
    left: '3%',
    right: '4%',
    bottom: '8%',
    top: '15%',
    containLabel: true
  },
  toolbox: {
    feature: {
      saveAsImage: { title: 'Save' },
      dataZoom: {},
      restore: {}
    },
    right: '20px'
  },
  dataZoom: [{
    type: 'inside',
    start: 0,
    end: 100
  }],
  series: [{
    data: props.allData,
    type: props.selectedInterval === 'quarterly' ||
          props.selectedInterval === 'halfYearly' ||
          props.selectedInterval === 'yearly' ||
          props.selectedInterval === 'all' ? 'line' : 'bar',
    barWidth: '60%',
    smooth: true,
    itemStyle: {
      color: currentTheme.value ? '#36a836' : '#1a5d1a',
      borderRadius: [4, 4, 0, 0]
    },
    emphasis: {
      itemStyle: {
        color: currentTheme.value ? '#4cd94c' : '#2d8a2d'
      }
    }
  }]
}));

// Single watcher for all reactive dependencies
watch([currentTheme, () => props.allData, () => props.chartTitle, () => props.xAxisData, () => props.selectedInterval],
  () => {
    if (chartRef.value) {
      nextTick(() => {
        chartRef.value.setOption(chartOptions.value);
      });
    }
  },
  { immediate: true }
);

onMounted(() => {
  nextTick(() => {
    if (chartRef.value) {
      chartRef.value.setOption(chartOptions.value);
    }
  });
  setTimeout(() => {
    isLoading.value = false;
  }, 800);
});
</script>

<template>
  <div class="chart-container">
    <div v-if="isLoading" class="chart-loading">
      <div class="loader"></div>
      <p>Loading chart data...</p>
    </div>
    <v-chart 
      ref="chartRef" 
      class="chart-render" 
      :class="{ 'is-loading': isLoading }" 
      :option="chartOptions" 
      :autoresize="true" 
    />
  </div>
</template>

<style scoped>
.chart-container {
  width: 100%;
  height: 100%;
  padding: 0;
  border-radius: 8px;
  overflow: hidden;
  position: relative;
}

.chart-render {
  width: 100%;
  height: 400px;
  border-radius: 8px;
  transition: opacity 0.3s ease;
}

.chart-render.is-loading {
  opacity: 0.5;
}

.chart-loading {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background-color: var(--background-color);
  opacity: 0.8;
  z-index: 10;
  border-radius: 8px;
  transition: background-color 0.3s ease;
}

[data-theme="dark"] .chart-loading {
  background-color: rgba(30, 30, 30, 0.8);
}

[data-theme="dark"] .chart-loading p {
  color: #ffffff;
}

.chart-loading p {
  margin-top: 16px;
  color: #6c757d;
  font-size: 14px;
}

.loader {
  border: 3px solid #f3f3f3;
  border-radius: 50%;
  border-top: 3px solid #3498db;
  width: 40px;
  height: 40px;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

@media (max-width: 768px) {
  .chart-render {
    height: 300px;
  }
}
</style>