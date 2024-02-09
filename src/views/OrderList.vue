<script setup>
import {ref, computed, onMounted, onUnmounted, watch } from 'vue';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import OrderItemRow from '@/components/OrderItemRow.vue';
import { products } from '@/util/constants';
import { fontNotoSansOriya } from '@/fonts/NotoSansOriya.js';
import { db } from '@/fb';
import { updateEditOrder, updateUnEditOrder } from "@/dbQueries";
import { useSessionStore } from "@/stores/userSessionStore";
import { useOrderStore } from "@/stores/orderSessionStore";
import { getFormattedDate } from '@/util/util';

// Initialize the session store here
const sessionStore = useSessionStore();
const orderStore = useOrderStore();

const notification = ref({
    success: true,
    msg: ''
});

const orders = ref([]);
const currentOrder = ref(null);
const modalIsOpen = ref(false);
const isInvoiceButtonClicked = ref(false);
const isLoading = ref(false);
const editBtnEnabled = ref(false);

// Introduce a flag to track saved changes in the modal
const modalCloseWithoutSave = ref(false);

// Create ref for search query
const searchQuery = ref('');

// computed filtered orders property checks continously for any chnages to the orders and filterOrders method written below
const filteredOrders = computed(() => {
    return orders.value.filter(order => order.customerName.toLowerCase().includes(searchQuery.value.toLowerCase()));
});

onMounted(() => {
  // Get orders from the Pinia store when the component is mounted
  orders.value = orderStore.getOrders();
});

onUnmounted(() => {
  // Save orders to the Pinia store when the component is unmounted
  orderStore.saveOrders(orders.value);
});

watch(() => orders.value, (newOrders) => {
  orderStore.saveOrders(newOrders);
});

// calculate total discounted amount
const calcTotalBillAmt = () => {
  let totalOrderAmt = 0;
  itemTotalPrices.forEach((value, key) => totalOrderAmt += value);
  currentOrder.value.totalBillAmt = Math.round(totalOrderAmt);
}

// calculate total mrp amount
const calcTotalMrpAmount = () => {
  let totalMrpAmount = 0;
  itemTotalMrpPrices.forEach((value, key) => totalMrpAmount += value);
  currentOrder.value.totalMrpBillAmt =  Math.round(totalMrpAmount);
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

const updateStatus = async () => {
    if (isSaveButtonDisabled.value) {
         // Button is disabled, do not save data
        return;
    }
    isLoading.value = true;

    const updateResult = await updateEditOrder(db, currentOrder.value);
    if (updateResult) {
      // Save the order data to the Pinia store
      orderStore.saveOrders(orders.value);

      notification.value.success = updateResult;
      notification.value.msg = 'Saved successfully.';
    } else {
      notification.value.success = updateResult;
      notification.value.msg = 'Failed.';
    }

    isLoading.value = false;
    modalCloseWithoutSave.value = false; // Reset the flag after saving
}

const orderDetails = async () => {
    isLoading.value = true;

    const updateResult = await updateUnEditOrder(db, currentOrder.value);
    if (updateResult) {
      // Save the order data to the Pinia store
      orderStore.saveOrders(orders.value);

      notification.value.success = updateResult;
      notification.value.msg = 'Saved successfully.';
    } else {
      notification.value.success = updateResult;
      notification.value.msg = 'Failed.';
    }

    isLoading.value = false;
    modalCloseWithoutSave.value = false; // Reset the flag after saving
}

const closeModal = () => {
  if (modalCloseWithoutSave) {
    // Handle the case where the modal was closed without saving changes
    orders.value = orderStore.getOrders();
    console.log('Modal closed without saving changes');
  }

  // orderStore.saveOrders(orders.value);
  currentOrder.value = null;
  modalIsOpen.value = false;
  editBtnEnabled.value = false;
  notification.value = {
        success: true,
        msg: ''
  };

  itemTotalPrices.clear();
  modalCloseWithoutSave.value = false; // Reset the flag
}

const addOrderItem = () => {
	currentOrder.value.items.push({ name: '', qty: 0 });
}

const isSaveButtonDisabled = computed(() => {
    const noItem = currentOrder.value?.items == null || currentOrder.value?.items.length === 0;
    const hasInvalidQuantity = currentOrder.value?.items.some(item => item.qty < 1);

    return hasInvalidQuantity || noItem;
});

// Used for generating formatted date in the invoice pdf
const formatDate = (dateString) => {
  // Split the string into [YYYY, MM, DD]
  let parts = dateString.split('-');

  // Rearrange to [DD, MM, YYYY] and join with '-'
  return parts.reverse().join('/');
}

// create the PDF Invoice
const createPDF = (currentOrder) => {
  // Create a new instance of jsPDF
  const doc = new jsPDF();

  // add the font to jsPDF
  doc.addFileToVFS("NotoSansOriya-Regular.ttf", fontNotoSansOriya);
  doc.addFont("NotoSansOriya-Regular.ttf", "NotoSansOriya", "normal");
  doc.setFont("NotoSansOriya");

  // Set the font sizes
  const titleFontSize = 18;
  const headingFontSize = 14;
  const contentFontSize = 12;
  const lineSpacing = 8; // Adjust line spacing as needed
  const horizontalSpacing = 10; // Adjust horizontal spacing as needed
  const dateFormatted = formatDate(getFormattedDate(new Date(currentOrder?.orderDate), false));
  // Add a title
  doc.setFontSize(titleFontSize);
  doc.text('Invoice', 100, 20);

  // Add some invoice details content
  doc.setFontSize(contentFontSize);
  doc.text(`Invoice Number: ${currentOrder?.sln}`, 10, 35);
  doc.text(`Invoice Date: ${dateFormatted}`, 10, 35 + lineSpacing);

  // Add 'Bill From' section
  doc.setFontSize(headingFontSize);
  doc.text('Bill From:', 10, 60);
  doc.setFontSize(contentFontSize);
  doc.text('Ayurved Unnati Sansthan', 10, 60 + lineSpacing);
  doc.text('Banadevi Patna, Kabisurya Nagar, Ganjam', 10, 60 + 2 * lineSpacing);
  doc.text('+91 9652976973', 10, 60 + 3 * lineSpacing);

  // Add 'Bill To' section
  doc.setFontSize(headingFontSize);
  doc.text('Bill To:', 140 + horizontalSpacing, 60);
  doc.setFontSize(contentFontSize);
  // Split the customer name into multiple lines if it's too long
  let customerNameLines = doc.splitTextToSize(currentOrder?.customerName, 50); // Adjust the width as needed
  for (let i = 0; i < customerNameLines.length; i++) {
    doc.text(customerNameLines[i], 140 + horizontalSpacing, 60 + lineSpacing * (i + 1));
  }

  // Add a table (replace this with your actual data)
  const headers = ['Sln', 'Item', 'Qty', 'MRP', 'Disc', 'Total'];
  let data = [];
  const invoiceItems = currentOrder.items;

  if (invoiceItems && typeof invoiceItems === 'object') {
    let productData = {};
    for (let i = 0; i < products.length; i++) {
      productData[products[i].name] = products[i];
    }

    if (Array.isArray(invoiceItems)) {
      // If currentOrder is already an array, use it directly
      data = invoiceItems.map((item, i) => [
        `${i + 1}`, // Adding 1 to index to start from 1
        `${item.name}`,
        `${item.qty}`,
        `${productData[item.name] ? productData[item.name].mrp : 0}`, // Assuming products is an array and you need to find the matching product
        `${item.discount}`,
        `${(productData[item.name].mrp * item.qty * (1 - item.discount / 100)).toFixed(2)}`
      ]);
    } else {
      // If currentOrder is an object, convert it to an array first
      const orderArray = Object.values(invoiceItemcurrentOrder?.orderDates);
      data = orderArray.items.map((item, i) => [
        `${i + 1}`, // Adding 1 to index to start from 1
        `${item.name}`,
        `${item.qty}`,
        `${productData[item.name] ? productData[item.name].mrp : 0}`, // Assuming products is an array and you need to find the matching product
        `${item.discount}`,
        `${(productData[item.name].mrp * item.qty * (1 - item.discount / 100)).toFixed(2)}`
      ]);
    }
  }

  if (data.length > 0) {
    doc.autoTable({
      startY: 100,
      head: [headers],
      body: data,
      margin: { top: 10, left: horizontalSpacing, right: horizontalSpacing }
    });
  }

  const currencySymbol = '\u20B9';

  // Calculate the sum of total values
  const totalSum = data.reduce((sum, item) => sum + parseFloat(item[5]), 0);

  // Add the total, tax, and final amount
  const finalAmount = Math.round(totalSum);

  doc.setFontSize(contentFontSize+1);
  doc.text(`Final Amt: ${currencySymbol}${finalAmount.toFixed(2)}`, 150, doc.autoTable.previous.finalY + 2 * (lineSpacing - 2));

  // Save the PDF
  doc.save(`Bill_${currentOrder?.sln}_(${dateFormatted}).pdf`);
};
</script>

<template>
    <section>
        <div class="grid">
            <div class="order-list-container">
                <h5 class="order-list-heading">Order List</h5>
                <figure>
                    <input type="search" name="search" id="search" v-model="searchQuery">
                    <table role="grid">
                        <thead>
                            <tr>
                              <th scope="col">#</th>
                              <th scope="col">Customer</th>
                              <th scope="col">Address</th>
                              <th scope="col">Date</th>
                              <th scope="col">Status</th>
                              <th scope="col">Salesman</th>
                              <th scope="col">Notes</th>
                              <th scope="col">Created By</th>
                              <th scope="col">Total bill Amount</th>
                              <th scope="col">Invoice</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr v-for="order in filteredOrders" :key="order?.sln" class="order-item-row" @click="currentOrder = order; (isInvoiceButtonClicked ? modalIsOpen = false : modalIsOpen = true);">
                                <td>{{ order?.sln }}</td>
                                <td>{{ order?.customerName }}</td>
                                <td>{{ order?.customerAddress }}</td>
                                <td>{{ getFormattedDate(new Date(order.orderDate), false) }}</td>
                                <td><code v-if="order?.status">{{ order?.status }}</code></td>
                                <td>{{ order?.salesman }}</td>
                                <td>{{ order?.notes }}</td>
                                <td>{{ order?.createdBy }}</td>
                                <td>&#8377; {{ order?.totalBillAmt }}</td>
                                <td><button id="invoice-btn" @click.prevent="createPDF(currentOrder=order); isInvoiceButtonClicked = true">Invoice</button></td>
                            </tr>
                        </tbody>
                    </table>
                </figure>
            </div>
        </div>
    </section>

    <!-- Modal -->
    <dialog id="order-detail" :open="modalIsOpen" v-if="modalIsOpen">
    <article class="update-order-modal" v-if="editBtnEnabled">
        <div class="symbols">
            <a href="#" @click.prevent="editBtnEnabled = !editBtnEnabled" class="edit-icon"><i class="fa-solid fa-pen-to-square fa-xl"></i></a>
            <a href="#close"
            aria-label="Close"
            class="close"
            data-target="#order-detail"
            @click="closeModal">
            </a>
        </div>
        <h6>#SLN: {{ currentOrder?.sln }}</h6>
        <div class="update-order-form">
            <form @submit.prevent="updateStatus">
                <label for="customer_name">
                    Customer Name
                    <input type="text" v-model="currentOrder.customerName" id="customer_name" name="customer_name" placeholder="Customer name" required>
                </label>

                <label for="customer_address">
                    Customer Name
                    <input type="text" v-model="currentOrder.customerAddress" id="customer_address" name="customer_address" placeholder="Customer address" required>
                </label>

                <label for="date">Date</label>
                <input type="date" v-model="currentOrder.orderDate" id="date" name="date" defaultItemNames placeholder="Date" required>

                <label for="salesman">Salesman</label>
                <input type="text" v-model="currentOrder.salesman" id="salesman" name="salesman" placeholder="Salesman" required>

                <label for="status">Status
                    <select id="status" v-model="currentOrder.status">
                        <option value="placed">Placed</option>
                        <option value="processed">Processed</option>
                        <option value="completed">Completed</option>
                        <option value="recieved">Payment Recieved</option>
                    </select>
                </label>

                <label for="notes">Notes</label>
                <textarea v-model="currentOrder.notes" id="notes" name="notes" placeholder="notes"></textarea>

                <!-- current orders -->
                <fieldset class="order-item-container">
                    <legend><label>Item List</label></legend>

                    <div v-for="(item, i) in currentOrder?.items" :key="i">
                        <OrderItemRow v-model:name="item.name" v-model:qty="item.qty" v-model:discount="item.discount" :index="i" :products="products" @delete-item="(idx) => currentOrder.items.splice(idx, 1)" @update:total-price="(productName, itemAmount) => updateTotalOrderAmt(productName, itemAmount)" @update:total-mrp-price="(productName, mrpTotal) => updateTotalMrpAmt(productName, mrpTotal)" />
                    </div>

                    <!-- Add item -->
                    <button type="button" @click="addOrderItem" class="secondary" :disabled=isSaveButtonDisabled>Add item</button>

                    <!-- Total Bill Amount -->
                    <label for="billAmt">
                      <p>Total Bill Amount: &#8377; {{ currentOrder?.totalBillAmt }} <small class="notification green strikethrough" v-if="currentOrder?.totalBillAmt > 1">( &#8377; {{currentOrder?.totalMrpBillAmt}})</small></p>
                    </label>
                </fieldset>

                <hr />

                <footer>
                <div class="grid">
                    <button
                        role="button"
                        class="primary"
                        data-target="#order-detail"
                        :aria-busy="isLoading"
                        @click="updateStatus"
                        :disabled=isSaveButtonDisabled
                        :aria-invalid="isSaveButtonDisabled ? 'true' : false">
                        Save
                    </button>
                    <button
                        role="button"
                        class="secondary"
                        data-target="#order-detail"
                        @click="closeModal">
                        Close
                    </button>
                </div>
                </footer>
                <div class="order-details-notification">
                    <!-- NOTIFICATION -->
                    <p v-if="notification?.msg" :class="{notification: true, success:notification.success, failed:!notification.success}">
                        <small>{{ notification?.msg }}</small>
                    </p>
                </div>
            </form>
        </div>
    </article>
    <article class="update-order-modal" v-else>
        <div class="symbols">
            <a href="#" @click.prevent="editBtnEnabled = !editBtnEnabled" class="edit-icon"><i class="fa-solid fa-pen-to-square fa-xl"></i></a>
            <a href="#close"
            aria-label="Close"
            class="close"
            data-target="order-detail"
            @click="closeModal">
            </a>
        </div>
        <div class="modal-info">
            <h6 class="sl-no">#SLN: {{ currentOrder?.sln }}</h6>
            <h6 id="modal-date">Date: {{ currentOrder?.orderDate }}</h6>
        </div>
        <div class="item-details">
            <h6 class="cust-info">Customer Name: <span id="update-order-customer-name">{{ currentOrder?.customerName }}</span></h6>
            <ol class="order-item-list">
                <li v-for="(item, i) in currentOrder?.items" :key="i">
                    {{ item?.name }}  <code>{{ item?.qty }}</code>
                </li>
            </ol>

            <label for="status">Status
                <select
                    id="status"
                    v-model="currentOrder.status"
                >
                    <option value="placed">Placed</option>
                    <option value="processed">Processed</option>
                    <option value="completed">Completed</option>
                    <option value="recieved">Payment Recieved</option>
                </select>
            </label>

            <label for="notes">Notes
                <textarea
                id="notes"
                v-model="currentOrder.notes"
                ></textarea>
            </label>

            <!-- Total Bill Amount -->
            <label for="billAmt">
              <p>Total Bill Amount: &#8377; {{ currentOrder?.totalBillAmt }} <small class="notification green strikethrough" v-if="currentOrder?.totalBillAmt > 1">( &#8377; {{currentOrder?.totalMrpBillAmt}})</small></p>
            </label>
        </div>
        <footer>
        <div class="grid">
            <button
                role="button"
                class="primary"
                data-target="order-detail"
                :aria-busy="isLoading"
                @click="orderDetails">
                Save
            </button>
            <button
                role="button"
                class="secondary"
                data-target="order-detail"
                @click="closeModal">
                Close
            </button>
        </div>
        </footer>
        <div class="order-details-notification">
            <!-- NOTIFICATION -->
            <p v-if="notification?.msg" :class="{notification: true, success:notification.success, failed:!notification.success}">
                <small>{{ notification?.msg }}</small>
            </p>
        </div>
    </article>
    </dialog>

</template>


<style scoped>

.order-list-heading{
    font-size: 1.4rem;
    font-weight: bold;
}

.update-order-modal {
    margin-top: auto;
    padding-top: 1rem;
    width: 800px;
}

.update-order-form {
    margin: auto;
}

#update-order-customer-name {
    font-weight: bold;
    font-size: 110%;
    margin-left: 0;
}

.order-item-row {
    cursor: pointer;
}
.order-item-row:hover {
    filter: alpha(opacity=60);
    /* IE */
    -moz-opacity: 0.6;
    /* Mozilla */
    opacity: 0.6;
    font-weight: bolder;
}

.order-item-list {
    text-align: left;
}


.order-item-container {
    border: solid 1px gray;
    border-radius: 5px;
    padding: 1rem;
    margin-bottom: 1rem;

    filter: alpha(opacity=80);
    -moz-opacity: 0.8;
    opacity: 0.8;
}

.disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

button:not(.disabled) {
  cursor: pointer; /* Normal cursor for non-disabled buttons */
}

#invoice-btn {
  display: inline-block;
  height: 45px;
  width: 130px;
  padding: 5px 15px;
  font-size: 14px;
  cursor: pointer;
  text-align: center;
  text-decoration: none;
  outline: none;
  color: #000000;
  background-color: var(--primary);
  border: none;
  border-radius: 5px;
  box-shadow: 0 5px #999;
}

#invoice-btn:hover {
  background-color: #FFA500;
}

#invoice-btn:active {
  background-color: #ddd;
  transform: translateY(2px);
}

.red {
    color: red;
}

.green {
  color: green;
}

.strikethrough {
  text-decoration: line-through;
}

.symbols {
    display: flex;
    width: 100%;
    flex-direction: row;
}

.edit-icon i {
    color: #c0ca33;
}


.edit-icon {
    float: left;
    position: relative;
}

.close {
    margin: 0;
    padding: 3% 95%;
}

.modal-info{
    margin: 1rem 0 0 0;
    display: inline-block;
    width: 100%;
}

.sl-no {
    float: left;
}

#modal-date {
    float: right;
}

#modal-date::first-letter {
    color: var(--primary);
    font-weight: bold;
    font-size: 150%;
}

hr {
    margin: 1rem 0;
}

#search {
    max-width: fit-content;
    display: block;
    margin-left: auto;
    margin-right: 0;
}

/* for mobile size */
@media (min-width: 0px) and (max-width: 426px){
    .modal-info {
        display: inline-block;
        width: 100%;
        margin-left: auto;
    }

    #modal-date {
        display: block;
        margin-left: auto;
        float: left;
    }

    .cust-info {
        display: block;
        text-align: left;
    }
    .item-details {
        display: block;
    }

    #search {
        max-width: 100%;
        display: block;        
    }
}

/* for tablet size */
@media (min-width: 427px) and (max-width: 768px) {
    .grid button {
        margin-top: 1.5rem;
    }
}

/* for laptop and desktop size */
@media (min-width: 769px) and (max-width: 1024px) {
    .grid button {
        margin-top: 1.5rem;
    }
}

.order-details-notification {
    margin-top: 2rem;
}
</style>
