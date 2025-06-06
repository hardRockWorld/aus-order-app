<script setup>
import { products } from '@/util/constants';
import OrderItemRow from '../components/OrderItemRow.vue';
import {ref, computed } from 'vue';
import { addNewOrder, fetchSingleDocRef } from "@/dbQueries";
import { db } from '@/fb';
import { useSessionStore } from "@/stores/userSessionStore";
import { useOrderStore } from "@/stores/orderSessionStore";

const sessionStore = useSessionStore();
const orderStore = useOrderStore();

const loading = ref(false);
const discRate = ref(0);

const blankOrder = {
    customerName: '',
    customerAddress: '',
    orderDate: Date.now(),
    salesman: '',
    items: [ {name: '', qty: 0} ],
    status: 'placed',
    notes: '',
    totalBillAmt: 0,
    totalMrpBillAmt: 0
};
const order = ref({...blankOrder});

const notificationMsg = ref('');

const addOrderItem = () => {
    order.value.items.push({name: '', qty: 0});
}

// calculate total discounted amount
const calcTotalBillAmt = () => {
  let totalOrderAmt = 0;
  itemTotalPrices.forEach((value, key) => totalOrderAmt += value);
  order.value.totalBillAmt = Math.round(totalOrderAmt);
}

// calculate total mrp amount
const calcTotalMrpAmount = () => {
  let totalMrpAmount = 0;
  itemTotalMrpPrices.forEach((value, key) => totalMrpAmount += value);
  order.value.totalMrpBillAmt = totalMrpAmount;
}

// for updating total discounted amt
const itemTotalPrices = new Map();
const updateTotalOrderAmt = (productName, itemAmount) => {
  itemTotalPrices.set(productName, itemAmount);
  // calculate the total order amount
  calcTotalBillAmt();
}

// for updating total mrp amt
const itemTotalMrpPrices = new Map();
const updateTotalMrpAmt = (productName, mrpTotal) => {
  itemTotalMrpPrices.set(productName, mrpTotal);
  // calculate the total order amount
  calcTotalMrpAmount();
}


// get the discountRate
const getDiscountRate = (discount_rate) => {
    discRate.value = discount_rate;
}

const submit = async () => {
    loading.value = true;

    const sessionUserEmail = sessionStore.getUser().email;
    const submitResult = await addNewOrder(db, order.value, discRate.value, sessionUserEmail);

    if (submitResult && submitResult.docRef) {

      const orderData = await fetchSingleDocRef(submitResult.docRef);

      // Save the order data to the Pinia store
      orderStore.pushOrder(orderData);

      // Notify user with message
      notificationMsg.value = `Order created | sln : ${submitResult.sln}`;
      itemTotalPrices.clear();
      calcTotalBillAmt();
      order.value = {...blankOrder, items: [ {name: '', qty: 0} ], discount: 0};
      loading.value = false;
    } else {
      notificationMsg.value = `Did not Save..`;
      calcTotalBillAmt();
      loading.value = false;
    }
};

const isSaveButtonDisabled = computed(() => {
    const noItem = order.value.items == null || order.value.items.length === 0;
    const hasInvalidQuantity = order.value.items.some(item => item.qty < 1);
    const hasInvalidName = order.value.items.some(item => {
        const productName = item.name.trim();
        return productName === '';
    });
    return hasInvalidQuantity || hasInvalidName || noItem;
});
</script>

<template>
    <section>
        <div class="grid">
            <div class="order-form">
                <h5>Order Entry</h5>
                <form @submit.prevent="submit">
                    <label for="customer_name">
                        Customer Name
                        <input type="text" v-model="order.customerName" id="customer_name" name="customer_name" placeholder="Customer name" required>
                    </label>

                    <label for="customer_address">
                        Customer Address
                        <input type="text" v-model="order.customerAddress" id="customer_address" name="customer_address" placeholder="Customer address" required>
                    </label>

                    <label for="date">Date</label>
                    <input type="datetime-local" v-model="order.orderDate" id="date" name="date" placeholder="Date" required>

                    <label for="salesman">Salesman</label>
                    <input type="text" v-model="order.salesman" id="salesman" name="salesman" placeholder="Salesman" required>

                    <label for="notes">Notes</label>
                    <textarea v-model="order.notes" id="notes" name="notes" placeholder="notes"></textarea>

                    <fieldset class="order-item-container">
                        <legend><label>Item List</label></legend>

                        <div v-for="(item, i) in order.items" :key="i">
                            <OrderItemRow v-model:name="item.name" v-model:qty="item.qty" v-model:discount="item.discount" :index="i" :products="products" @delete-item="idx => order.items.splice(idx, 1)" @update:total-price="(productName, itemAmount, totalMrpAmount) => updateTotalOrderAmt(productName, itemAmount, totalMrpAmount)" @update:total-mrp-price="(productName, mrpTotal) => updateTotalMrpAmt(productName, mrpTotal)" @update:discount="(discount_rate) => getDiscountRate(discount_rate)"/>
                        </div>

                        <!-- Add item -->
                        <button type="button" @click="addOrderItem" class="secondary" :disabled=isSaveButtonDisabled>Add item</button>

                        <!-- Total Bill Amount -->
                        <label for="billAmt">
                          <p><span style="color: #0a3d0a">Total Bill Amount: &#8377; {{ order.totalBillAmt }}</span> <small class="notification green strikethrough" v-if="order.totalBillAmt > 1.00">( &#8377; {{order.totalMrpBillAmt}})</small></p>
                        </label>
                    </fieldset>

                    <hr/>

                    <!-- Button -->
                    <button type="submit" class="submit" :aria-busy="loading" :disabled=isSaveButtonDisabled>Submit</button>

                    <!-- {{ order }} -->

                    <!-- NOTIFICATION -->
                    <div v-if="notificationMsg" class="notification">
                        <small>{{ notificationMsg }}</small>
                    </div>

                </form>
            </div>
        </div>
    </section>
</template>


<style scoped>
.order-form {
    margin: auto;
    background-color: var(--background-color);
    padding: 24px;
    border-radius: 12px;
    box-shadow: 0 2px 8px rgba(10, 61, 10, 0.1);
}

/* Form inputs */
input, select, textarea {
    background-color: var(--background-color);
    border: 1px solid #0a3d0a !important;
    padding: 8px 12px;
    border-radius: 8px;
    font-size: 14px;
    font-weight: 500;
    color: #072907 !important;
    transition: all 0.2s ease;
}

input:focus, select:focus, textarea:focus {
    outline: none;
    border-color: #072907 !important;
    box-shadow: 0 0 0 2px rgba(10, 61, 10, 0.1) !important;
}

input::placeholder, textarea::placeholder {
    color: rgba(7, 41, 7, 0.5) !important;
}

hr {
    margin: 1rem 0;
}

.submit {
    margin-top: 1rem;
}

.order-item-container {
    border: solid 1px gray;
    border-radius: 5px;
    padding: 20px;
    margin-bottom: 10px;
    background-color: var(--background-color);
    filter: alpha(opacity=80);
    -moz-opacity: 0.8;
    opacity: 0.8;
}

.green {
  color: green;
}

.strikethrough {
  text-decoration: line-through;
}

/* Dark mode secondary button hover styles */
[data-theme="dark"] button.secondary:hover {
  color: #0a3d0a !important;
  background-color: #ffffff !important;
  border-color: #0a3d0a !important;
}

.order-entry-container {
  color: #072907;
  padding: 24px;
}

.form-title {
  font-size: 28px;
  font-weight: 700;
  color: #072907;
  margin-bottom: 24px;
  letter-spacing: -0.5px;
}

.form-section {
  margin-bottom: 24px;
}

.form-section-title {
  font-size: 18px;
  font-weight: 700;
  color: var(--text-color);
  margin-bottom: 16px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.form-group label {
  color: var(--text-color);
  font-weight: 600;
  margin-bottom: 8px;
}

.form-control {
  color: var(--text-color);
  background-color: var(--background-color);
  font-weight: 500;
  border-color: var(--text-color);
}

.order-items label {
  color: var(--text-color);
  font-weight: 600;
}

.total-section {
  color: var(--text-color);
  font-weight: 700;
}

.total-amount {
  font-size: 24px;
  color: var(--text-color);
  font-weight: 800;
}

.action-buttons button {
  font-weight: 600;
}

/* Theme-specific overrides */
[data-theme="dark"] .form-control {
  background-color: #1e1e1e !important;
  color: #ffffff !important;
  border-color: #404040 !important;
}

[data-theme="dark"] .form-control:focus {
  border-color: #606060 !important;
  box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.1);
}

[data-theme="dark"] select.form-control option {
  background-color: #1e1e1e;
  color: #ffffff;
}

/* Theme-specific overrides for dark mode */
[data-theme="dark"] input,
[data-theme="dark"] select,
[data-theme="dark"] textarea {
    background-color: #1e1e1e !important;
    color: #ffffff !important;
    border-color: #404040 !important;
}

[data-theme="dark"] input::placeholder,
[data-theme="dark"] textarea::placeholder {
    color: rgba(255, 255, 255, 0.6) !important;
}

[data-theme="dark"] label {
    color: #ffffff !important;
}

[data-theme="dark"] .order-item-container {
    background-color: #1e1e1e;
    border-color: #404040;
}

[data-theme="dark"] p,
[data-theme="dark"] small,
[data-theme="dark"] span {
    color: #ffffff !important;
}

[data-theme="dark"] small.green {
    color: #4caf50 !important;
}

[data-theme="dark"] h5 {
    color: #ffffff !important;
}
</style>
