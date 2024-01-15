<script setup>
import { ref, computed, onMounted } from 'vue';
import { RouterLink, RouterView, useRouter, useRoute } from 'vue-router';
import { useSessionStore } from '@/stores/userSessionStore';
import { useOrderStore } from "@/stores/orderSessionStore";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { auth } from './fb';

const sessionStore = useSessionStore();
const orderStore = useOrderStore();
const router = useRouter();
const route = useRoute();
const path = computed(() => route.path);

const proxyIsLoggedIn = ref(sessionStore.getUserLoggedIn());
const currentUser = ref(null);

onMounted(() => {
  onAuthStateChanged(auth, (user) => {
    proxyIsLoggedIn.value = !!user;
    currentUser.value = user;
    console.log("user:");
    console.log(user);
    if (user) {
      sessionStore.setUser(user, user.email, true, (new Date()).getTime());
    } else {
      sessionStore.removeUser();
    }
  });
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
  <header>
    <nav>
      <ul>
        <li><RouterLink class="logo-link contrast" to="/"><strong>ORDERS</strong></RouterLink></li>
        <li><RouterLink class="logo-link contrast" v-if="proxyIsLoggedIn" to="/dashboard"><strong>Dashboard</strong></RouterLink></li>
      </ul>
      <h4 v-if="proxyIsLoggedIn && currentUser">Welcome {{currentUser.email}}</h4>
      <ul>
        <li><RouterLink to="/orders" v-if="proxyIsLoggedIn" class="contrast">Order List</RouterLink></li>
        <li><RouterLink to="/login" v-if="!proxyIsLoggedIn && path !== '/login'" class="contrast">Login</RouterLink></li>
        <li v-if="proxyIsLoggedIn"><a href="#" @click.prevent="logout" class="contrast">Logout</a></li>
      </ul>
    </nav>
  </header>

  <main class="container">
    <router-view class="router-view"/>
  </main>

  <footer>
    <div class="footer">
      <small>Made with 💛 by <a href="https://in.linkedin.com/in/soumitri-pattnaik-69766a112" target="_blank">Soumitri</a></small>
    </div>
  </footer>
</template>


<style scoped>
.logo-link {
  text-decoration: none;
}
.logo-link::first-letter {
  font-size: 150%;
  color: var(--primary);
}
nav {
  border-bottom: solid 1px var(--secondary);
  display: flex;
  flex-direction: column;
}

nav ul {
  margin-left: 10px;
  margin-right: 10px;
}

.footer {
  margin: auto;
  width: 100vw;
  text-align: center;
}
.footer small {
  font-size: small;
}

.container {
  display: contents;
  width: 100%;
}

.router-view {
  width: 100%;
  margin: auto;
}

/* Responsive styles */
@media (min-width: 600px) {
  nav {
    flex-direction: row;
    justify-content: space-between;
  }

  .router-view {
    width: 80%;
  }

  /* .container {
  display: flex;
  flex-direction: column;
  width: 100%;
  } */
}
</style>
