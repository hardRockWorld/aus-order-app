import { createRouter, createWebHistory } from 'vue-router';
import Dashboard from "@/views/Dashboard.vue";
import OrderEntry from '@/views/OrderEntry.vue';
import OrderList from '@/views/OrderList.vue';
import LandingPage from '@/components/LandingPage.vue';
import Analysis from '@/components/Analysis.vue';
import {
  onAuthStateChanged
} from 'firebase/auth';
import { auth } from '@/fb';

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: OrderEntry,
      meta: {
        requiresAuth: true,
        title: 'Order Entry Form'
      }
    },
    {
      path: '/dashboard',
      name: 'dashboard',
      component: Dashboard,
      meta: {
        requiresAuth: true,
        title: 'Dashboard'
      }
    },
    {
      path: '/orders',
      name: 'orders',
      component: LandingPage,
      redirect: '/orders/order-list',
      meta: {
        requiresAuth: true,
        title: 'Orders'
      },
      children: [
      {
        // OrderList will be rendered inside Order's <router-view>
        // when /orders/order-list is matched
        path: 'order-list',
        name: 'orderList',
        component: OrderList,
        meta: {
          requiresAuth: true,
          title: 'Order List'
        }
      },
      {
        // Analysis will be rendered inside Order's <router-view>
        // when /orders/analysis is matched
        path: 'analysis',
        name: 'analysis',
        component: Analysis,
        meta: {
          requiresAuth: true,
          title: 'Orders Analysis'
        }
      },
    ]
    },
    {
      path: '/login',
      name: 'login',
      component: () => import('../views/Login.vue'),
      meta: {
        title: 'Login'
      }
    }
  ]
})

// Get current user
const getCurrentUser = () => {
  return new Promise((resolve, reject) => {
      const removeListener = onAuthStateChanged(
          auth,
          (user) => {
              removeListener();
              resolve(user);
          },
          reject
      );
  });
};

// Global auth guard
router.beforeEach(async(to, from, next) => {
  if (to?.matched.some((record) => record.meta.requiresAuth)) {
      if (await getCurrentUser()) {
          next();
      } else {
          next('login');
      }
  } else {
      next();
  }
});

router.afterEach((toRoute, fromRoute) => {
  window.document.title = toRoute?.meta && toRoute?.meta?.title ? toRoute?.meta?.title : 'Aus Order App';
});

export default router
