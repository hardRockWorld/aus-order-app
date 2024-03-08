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
}

.links {
  display: flex;
  justify-content: space-evenly;
  width: 100%;
  margin-bottom: 2rem;
}

.tab-link {
  text-decoration: none;
  padding: .5rem 1rem;
  cursor: pointer;
  transition: background-color 0.3s ease;
  color: #FFFFFF;
  border: 1px solid transparent;
}

.tab-link.router-link-exact-active {
  background-color: var(--primary);
  color: var(--primary-inverse);
  border-color: var(--primary);
  font-weight: bold;
  outline: none;
}

/* Add styles for inactive tabs */
.tab-link:not(.router-link-exact-active) {
  background-color: #f0f0f0;
  color: #333;
}
</style>
