<script setup>
import { ref, computed, onMounted, watch } from 'vue';
import { RouterLink, RouterView, useRouter, useRoute } from 'vue-router';
import { useSessionStore } from '@/stores/userSessionStore';
import { useOrderStore } from "@/stores/orderSessionStore";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { auth } from './fb';
import { useThemeStore } from '@/stores/themeStore';

const sessionStore = useSessionStore();
const orderStore = useOrderStore();
const router = useRouter();
const route = useRoute();
const path = computed(() => route.path);

const proxyIsLoggedIn = ref(sessionStore.getUserLoggedIn());
const currentUser = ref(null);
const themeStore = useThemeStore();

// Remove local dark mode state and use Pinia store
const toggleDarkMode = () => {
  themeStore.toggleTheme();
};

onMounted(() => {
  // Ensure theme is applied on mount
  themeStore.setTheme(themeStore.isDark);
  // Forcefully set data-theme on <html> for global theming
  const htmlElement = document.documentElement;
  htmlElement.setAttribute('data-theme', themeStore.isDark ? 'dark' : 'light');
  console.log(`Initial theme set: ${htmlElement.getAttribute('data-theme')}`);

  onAuthStateChanged(auth, (user) => {
    proxyIsLoggedIn.value = !!user;
    currentUser.value = user;
    if (user) {
      sessionStore.setUser(user, user.email, true, (new Date()).getTime());
    } else {
      sessionStore.removeUser();
    }
  });
});

// Watch for theme changes and update <html> attribute
watch(() => themeStore.isDark, (isDark) => {
  const htmlElement = document.documentElement;
  htmlElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
  console.log(`Theme updated: ${htmlElement.getAttribute('data-theme')}`); // Debugging theme application
});

const logout = () => {
  signOut(auth)
      .then(() => {
        console.log('Logged out');
        orderStore.clearOrders();
        sessionStorage.removeItem('dataFetched');
        sessionStore.removeUser();
        proxyIsLoggedIn.value = false;
        router.push('/login');
      })
      .catch((error) => {
        console.log(error);
      });
}
</script>

<template>
  <div class="app-container">
    <header class="app-header">
      <nav>
        <div class="nav-brand">
          <RouterLink class="logo-link" to="/">
            <span class="logo-text">ORDERS</span>
          </RouterLink>
          <RouterLink class="nav-item" v-if="proxyIsLoggedIn" to="/dashboard">
            <span>Dashboard</span>
          </RouterLink>
        </div>

        <div class="welcome-message" v-if="proxyIsLoggedIn && currentUser">
          <span>Welcome, <strong>{{currentUser.email}}</strong></span>
        </div>

        <div class="nav-menu">
          <RouterLink to="/orders" v-if="proxyIsLoggedIn" class="nav-item">Order List</RouterLink>
          <RouterLink to="/login" v-if="!proxyIsLoggedIn && path !== '/login'" class="nav-item">Login</RouterLink>
          <a href="#" v-if="proxyIsLoggedIn" @click.prevent="logout" class="nav-item logout">Logout</a>
          <button @click="toggleDarkMode" class="dark-mode-toggle" title="Toggle dark mode" style="background:none;border:none;padding:0;cursor:pointer;outline:none;">
            <i v-if="themeStore.isDark" class="fas fa-moon"></i>
            <i v-else class="fas fa-sun"></i>
          </button>
        </div>
      </nav>
    </header>

    <main class="container">
      <router-view class="router-view" />
    </main>

    <footer class="app-footer">
      <div class="footer-content">
        <small>Made with 💛 by <a href="https://in.linkedin.com/in/soumitri-pattnaik-69766a112" target="_blank">Soumitri</a></small>
      </div>
    </footer>
  </div>
</template>

<style scoped>
.app-container {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  background-color: var(--background-color);
  color: var(--text-color);
}

.app-header {
  background-color: var(--background-color);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.08);
  position: sticky;
  top: 0;
  z-index: 100;
}

nav {
  display: flex;
  flex-direction: column;
  padding: 16px;
  max-width: 1200px;
  margin: 0 auto;
  width: 100%;
}

.nav-brand {
  display: flex;
  align-items: center;
  gap: 24px;
}

.logo-link {
  text-decoration: none;
  font-weight: 700;
  font-size: 24px;
  color: #072907;
}

.logo-text {
  color: #072907;
}

.logo-text::first-letter {
  font-size: 130%;
  color: #0a3d0a;
}

.welcome-message {
  font-size: 14px;
  color: #495057;
  /* Using regular text color */
  margin: 8px 0;
}

.nav-menu {
  display: flex;
  gap: 16px;
  align-items: center;
  margin-top: 8px;
}

.nav-item {
  text-decoration: none;
  color: var(--text-color);
  font-size: 15px;
  font-weight: 500;
  padding: 8px 32px; /* Further increased horizontal padding for wider box */
  min-width: 130px;   /* Ensures enough width for single line */
  border-radius: 4px;
  transition: background-color 0.2s, color 0.2s;
  text-align: center; /* Center text for better appearance */
  white-space: nowrap; /* Prevents text from wrapping to a new line */
}

.nav-item:hover {
  background-color: var(--primary-focus);
  color: var(--primary-hover);
}

.nav-item.logout {
  color: #dc3545;
}

.nav-item.logout:hover {
  background-color: #fdedec;
}

.container {
  flex: 1;
  width: 100%;
  max-width: 1200px;
  margin: 0 auto;
  padding: 0;
  background-color: var(--background-color); /* Use theme variable */
  color: var(--text-color); /* Use theme variable */
}

.router-view {
  width: 100%;
  margin: auto;
  background-color: inherit; /* Inherit from .container */
  color: inherit;
}

.app-footer {
  background-color: var(--background-color);
  padding: 16px 0;
  border-top: 1px solid #dee2e6;
  margin-top: auto;
  color: var(--text-color);
}

.footer-content {
  max-width: 1200px;
  margin: 0 auto;
  text-align: center;
  color: #6c757d;
}

.footer-content a {
  color: #3498db;
  text-decoration: none;
}

.footer-content a:hover {
  text-decoration: underline;
}

.dark-mode-toggle {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 36px;
  min-width: 36px;
  margin: 0;
  padding: 8px 16px;
  border-radius: 4px;
  transition: background-color 0.2s, color 0.2s;
  color: #0a3d0a;
}

.dark-mode-toggle:hover {
  background-color: rgba(10, 61, 10, 0.1);
  color: #072907;
}

.dark-mode-toggle i {
  font-size: 18px;
}

/* Dark mode text color overrides */
[data-theme="dark"] .nav-item {
  color: #ffffff !important;
}

[data-theme="dark"] .nav-item:hover {
  background-color: #2a2a2a;
  color: #d4af37 !important;
}

[data-theme="dark"] .nav-item.logout {
  color: #ff6b6b !important;
}

[data-theme="dark"] .nav-item.logout:hover {
  background-color: #2a2a2a;
  color: #ff4444 !important;
}

[data-theme="dark"] .logo-link,
[data-theme="dark"] .logo-text {
  color: #ffffff !important;
}

[data-theme="dark"] .logo-text::first-letter {
  color: #d4af37 !important;
}

[data-theme="dark"] .welcome-message,
[data-theme="dark"] .welcome-message strong {
  color: #ffffff !important;
}

[data-theme="dark"] .footer-content {
  color: #888888;
}

[data-theme="dark"] .footer-content a {
  color: #4caf50;
}

[data-theme="dark"] .footer-content a:hover {
  color: #51cf66;
}

/* Responsive styles */
@media (min-width: 768px) {
  nav {
    flex-direction: row;
    justify-content: space-between;
    align-items: center;
    padding: 12px 24px;
  }

  .welcome-message {
    margin: 0;
    text-align: center;
  }

  .nav-menu {
    margin-top: 0;
  }
}
</style>
