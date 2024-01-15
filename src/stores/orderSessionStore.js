import { defineStore } from 'pinia';

export const useOrderStore = defineStore('orders', {
    state: () => ({
        orders: [],
    }),
    actions: {
        // Save the orders
        saveOrders(orders) {
            this.orders = orders ?? [];
            console.log('Order # is: ' + this.orders.length);
            // Save orders to sessionStorage
            sessionStorage.setItem('orders', JSON.stringify(orders));
        },

        pushOrder(order) {
            this.orders.unshift(order);
            console.log('Order # is: ' + this.orders.length);
            // Save orders to sessionStorage
            // const ordersArray = [{ /* order data */ }, { /* another order data */ }];
            sessionStorage.setItem('orders', JSON.stringify(this.orders));
        },

        // Get all the Orders from this session
        getOrders() {
            // Retrieve orders from sessionStorage
            const storedOrders = sessionStorage.getItem('orders');
            this.orders = storedOrders ? JSON.parse(storedOrders) : [];

            return this.orders;
        },

        // Clear all the orders from the current session
        clearOrders() {
            // Clear orders from sessionStorage
            sessionStorage.removeItem('orders');

            this.orders = [];
        },
    },
});
