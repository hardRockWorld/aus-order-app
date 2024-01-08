import {collection, query, getDoc, getDocs, orderBy, updateDoc, doc, getCountFromServer, addDoc} from "firebase/firestore";
import {db} from "@/fb";

const addNewOrder = async (db, order, discRate, email) => {
    const ordersColl = collection(db, "orders");
    const ordersSnapshot = await getCountFromServer(ordersColl);

    const sln = ordersSnapshot.data().count + 1;
    const docData = {
        sln: sln,
        customerName: order.customerName,
        orderDate: order.orderDate,
        salesman: order.salesman,
        items: order.items,
        status: order.status,
        notes: order.notes,
        discount: discRate,
        totalBillAmt: order.totalBillAmt,
        totalMrpBillAmt: order.totalMrpBillAmt,
        createdBy: email
    }
    const docRef = await addDoc(ordersColl, docData);
    console.debug("Document written with ID: ", docRef.id);
    console.debug("Document is: ", docRef);

    // Return an object containing both docRef and sln
    return {
        docRef,
        sln
    };
};

const fetchSingleDocRef = async (docRef) => {
    // Retrieve the document data using the docRef
    const docSnapshot = await getDoc(docRef);
    const orderData = docSnapshot.data();

    return orderData;
};


const fetchAllOrders = async () => {
    let orders= []; // Clear the orders array
    const q = query(collection(db, "orders"), orderBy('sln', 'desc'));

    const querySnapshot = await getDocs(q);
    await querySnapshot.forEach((doc) => {
        orders.push({...doc.data(), id: doc.id});
    });

    return orders;
};

const updateEditOrder = async (db, currentOrder) => {
    let result;
    const docRef = doc(db, "orders", currentOrder.id);
    try {
        await updateDoc(docRef, {
            customerName: currentOrder.customerName,
            orderDate: currentOrder.orderDate,
            salesman: currentOrder.salesman,
            items: currentOrder.items,
            status: currentOrder.status,
            notes: currentOrder.notes,
            totalBillAmt: currentOrder.totalBillAmt,
            totalMrpBillAmt: currentOrder.totalMrpBillAmt,
            createdBy: currentOrder.createdBy
        });
        result = true;
    } catch(e) {
        result = false;
    }

    return result;
}

const updateUnEditOrder = async (db, currentOrder) => {
    let result;
    const docRef = doc(db, "orders", currentOrder.id);
    try {
        await updateDoc(docRef, {status: currentOrder.status, notes: currentOrder.notes});
        result = true;
    } catch(e) {
        result = false;
    }

    return result;
}

export { addNewOrder, fetchSingleDocRef, fetchAllOrders, updateUnEditOrder, updateEditOrder };