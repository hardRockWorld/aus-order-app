<template>
  <div class="tabs">
    <div class="links">
      <router-link class="tab-link" to="/orders/order-list">Order List</router-link>
      <router-link class="tab-link" to="/orders/analysis">Analysis</router-link>
    </div>
    <div class="router-view-container">
      <router-view></router-view>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { useSessionStore } from '../stores/userSessionStore';
const { currentUser } = useSessionStore();

const proxyIsLoggedIn = ref(false);
proxyIsLoggedIn.value = currentUser.isLoggedIn;
</script>

<style scoped>
.tabs {
  border-bottom: 1px solid var(--secondary);
  margin-bottom: 10px;
  text-align: center;
  width: 100%;
  box-sizing: border-box;
}

.links {
  display: flex;
  justify-content: space-evenly;
  width: 100%;
  margin-bottom: 1.5rem;
  padding: 0 1rem;
  box-sizing: border-box;
  gap: 0.5rem;
}

.tab-link {
  text-decoration: none;
  padding: 0.75rem 1.5rem;
  cursor: pointer;
  transition: all 0.2s ease;
  color: #072907;
  border: 1px solid transparent;
  border-radius: 6px;
  font-weight: 500;
  text-align: center;
  flex: 1;
  min-width: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.tab-link:hover {
  background-color: rgba(10, 61, 10, 0.1);
  border-color: #072907;
  transform: translateY(-1px);
}

.tab-link.router-link-exact-active {
  background-color: #0a3d0a;
  color: #ffffff;
  border-color: #0a3d0a;
  font-weight: bold;
  outline: none;
  box-shadow: 0 2px 4px rgba(10, 61, 10, 0.2);
}

/* Add styles for inactive tabs */
.tab-link:not(.router-link-exact-active) {
  background-color: #f5f5f5;
  color: #072907;
  border: 1px solid #0a3d0a;
}

.router-view-container {
  width: 100%;
  min-height: 0;
  overflow: hidden;
}

/* Dark theme styles */
[data-theme="dark"] .tab-link:not(.router-link-exact-active) {
  background-color: #2a2a2a;
  color: #ffffff;
  border-color: #404040;
}

[data-theme="dark"] .tab-link:hover {
  background-color: rgba(255, 255, 255, 0.1);
  border-color: #606060;
}

[data-theme="dark"] .tab-link.router-link-exact-active {
  background-color: #0a3d0a;
  color: #ffffff;
  border-color: #0a3d0a;
  box-shadow: 0 2px 4px rgba(255, 255, 255, 0.1);
}

/* Mobile breakpoints */
@media (max-width: 480px) {
  .links {
    flex-direction: column;
    gap: 0.75rem;
    padding: 0 0.5rem;
    margin-bottom: 1rem;
  }
  
  .tab-link {
    padding: 0.875rem 1rem;
    font-size: 0.9rem;
    white-space: normal;
    text-overflow: initial;
    overflow: visible;
  }
}

/* Medium mobile and small tablets */
@media (min-width: 481px) and (max-width: 768px) {
  .links {
    padding: 0 0.75rem;
    gap: 0.75rem;
  }
  
  .tab-link {
    padding: 0.8rem 1.2rem;
    font-size: 0.95rem;
  }
}

/* Tablets */
@media (min-width: 769px) and (max-width: 1024px) {
  .links {
    padding: 0 1rem;
    gap: 1rem;
    margin-bottom: 2rem;
  }
  
  .tab-link {
    padding: 0.875rem 1.75rem;
    font-size: 1rem;
  }
}

/* Large screens */
@media (min-width: 1025px) {
  .links {
    justify-content: center;
    gap: 2rem;
    max-width: 600px;
    margin: 0 auto 2rem auto;
  }
  
  .tab-link {
    flex: none;
    padding: 1rem 2rem;
    font-size: 1.1rem;
    min-width: 150px;
  }
}

/* Touch device optimizations */
@media (hover: none) and (pointer: coarse) {
  .tab-link {
    padding: 1rem 1.5rem;
    font-size: 1rem;
  }
  
  .tab-link:hover {
    transform: none;
  }
}

/* Accessibility improvements */
@media (prefers-reduced-motion: reduce) {
  .tab-link {
    transition: none;
  }
  
  .tab-link:hover {
    transform: none;
  }
}

/* Focus styles for keyboard navigation */
.tab-link:focus-visible {
  outline: 2px solid #072907;
  outline-offset: 2px;
}

[data-theme="dark"] .tab-link:focus-visible {
  outline-color: #ffffff;
}
</style>
