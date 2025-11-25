<script setup>
import { ref, computed, onMounted, watch } from "vue";
import { RouterLink, RouterView, useRouter, useRoute } from "vue-router";
import { useSessionStore } from "@/stores/userSessionStore";
import { useOrderStore } from "@/stores/orderSessionStore";
import { useProductStore } from "@/stores/productStore";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { auth } from "./fb";
import { isUserAdmin } from "@/db/priceService";
import { useThemeStore } from "@/stores/themeStore";

const sessionStore = useSessionStore();
const orderStore = useOrderStore();
const productStore = useProductStore();
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
    htmlElement.setAttribute(
        "data-theme",
        themeStore.isDark ? "dark" : "light",
    );
    console.log(`Initial theme set: ${htmlElement.getAttribute("data-theme")}`);

    // Initialize products (and seed if needed) at app startup
    try {
        productStore.loadProducts();
    } catch (e) {
        console.warn("Failed to load products on mount", e);
    }

    onAuthStateChanged(auth, (user) => {
        proxyIsLoggedIn.value = !!user;
        currentUser.value = user;

        if (user) {
            // Check admin status, set session store accordingly, and start realtime product updates.
            (async () => {
                try {
                    console.log("[Auth] onAuthStateChanged: user logged in", {
                        uid: user.uid,
                        email: user.email,
                    });
                    const admin = await isUserAdmin(user.uid);
                    console.log("[Auth] isUserAdmin result:", admin);
                    // setUser supports an optional isAdmin flag (see session store)
                    sessionStore.setUser(
                        user,
                        user.email,
                        true,
                        new Date().getTime(),
                        admin,
                    );
                    sessionStore.setIsAdmin(admin);
                    console.log("[Session] setIsAdmin ->", admin);
                    // After admin status is known, attempt a load again so admins can seed if DB is empty
                    try {
                        console.log("[Products] Post-auth loadProducts start");
                        await productStore.loadProducts();
                        console.log("[Products] Post-auth loadProducts done");
                    } catch (e) {
                        console.warn("Post-auth product load failed", e);
                    }
                } catch (err) {
                    console.error("isUserAdmin lookup failed", err);
                    // fallback: mark non-admin
                    sessionStore.setUser(
                        user,
                        user.email,
                        true,
                        new Date().getTime(),
                        false,
                    );
                    sessionStore.setIsAdmin(false);
                } finally {
                    // start realtime product listener for logged in users (admins and non-admins)
                    try {
                        productStore.startRealtime();
                    } catch (e) {
                        console.warn(
                            "Failed to start productStore realtime",
                            e,
                        );
                    }
                }
            })();
        } else {
            sessionStore.removeUser();
            // stop realtime listener when signed out
            try {
                productStore.stopRealtime();
            } catch (e) {
                console.warn("Failed to stop productStore realtime", e);
            }
        }
    });
});

// Watch for theme changes and update <html> attribute
watch(
    () => themeStore.isDark,
    (isDark) => {
        const htmlElement = document.documentElement;
        htmlElement.setAttribute("data-theme", isDark ? "dark" : "light");
        console.log(`Theme updated: ${htmlElement.getAttribute("data-theme")}`); // Debugging theme application
    },
);

const logout = () => {
    signOut(auth)
        .then(() => {
            console.log("Logged out");
            orderStore.clearOrders();
            sessionStorage.removeItem("dataFetched");
            sessionStore.removeUser();
            proxyIsLoggedIn.value = false;
            router.push("/login");
        })
        .catch((error) => {
            console.log(error);
        });
};
</script>

<template>
    <div class="app-container">
        <header class="app-header">
            <nav>
                <div class="nav-brand">
                    <RouterLink class="logo-link" to="/">
                        <span class="logo-text">ORDERS</span>
                    </RouterLink>
                    <RouterLink
                        class="nav-item"
                        v-if="proxyIsLoggedIn"
                        to="/dashboard"
                    >
                        <span>Dashboard</span>
                    </RouterLink>
                    <RouterLink
                        class="nav-item"
                        v-if="proxyIsLoggedIn"
                        to="/price-management"
                    >
                        <span>Price Management</span>
                    </RouterLink>
                </div>

                <div
                    class="welcome-message"
                    v-if="proxyIsLoggedIn && currentUser"
                >
                    <span
                        >Welcome, <strong>{{ currentUser.email }}</strong></span
                    >
                </div>

                <div class="nav-menu">
                    <RouterLink
                        to="/orders"
                        v-if="proxyIsLoggedIn"
                        class="nav-item"
                        >Order List</RouterLink
                    >
                    <RouterLink
                        to="/login"
                        v-if="!proxyIsLoggedIn && path !== '/login'"
                        class="nav-item"
                        >Login</RouterLink
                    >
                    <a
                        href="#"
                        v-if="proxyIsLoggedIn"
                        @click.prevent="logout"
                        class="nav-item logout"
                        >Logout</a
                    >
                    <button
                        @click="toggleDarkMode"
                        class="dark-mode-toggle"
                        title="Toggle dark mode"
                        style="
                            background: none;
                            border: none;
                            padding: 0;
                            cursor: pointer;
                            outline: none;
                        "
                    >
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
                <small
                    >Made with 💛 by
                    <a
                        href="https://in.linkedin.com/in/soumitri-pattnaik-69766a112"
                        target="_blank"
                        >Soumitri</a
                    ></small
                >
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
    color: var(--primary);
}

.logo-text {
    color: var(--primary);
}

.logo-text::first-letter {
    font-size: 130%;
    color: var(--accent-gold, #d4af37);
}

.welcome-message {
    font-size: 14px;
    color: var(--text-muted);
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
    min-width: 130px; /* Ensures enough width for single line */
    border-radius: 4px;
    transition:
        background-color 0.2s,
        color 0.2s;
    text-align: center; /* Center text for better appearance */
    white-space: nowrap; /* Prevents text from wrapping to a new line */
}

.nav-item:hover {
    background-color: var(--primary-focus);
    color: var(--primary-hover);
}

.nav-item.logout {
    color: var(--danger);
}

.nav-item.logout:hover {
    background-color: var(--danger-bg);
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
    border-top: 1px solid var(--border-color, #dee2e6);
    margin-top: auto;
    color: var(--text-color);
}

.footer-content {
    max-width: 1200px;
    margin: 0 auto;
    text-align: center;
    color: var(--text-muted);
}

.footer-content a {
    color: var(--link-color);
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
    transition:
        background-color 0.2s,
        color 0.2s;
    color: var(--primary);
}

.dark-mode-toggle:hover {
    background-color: var(--primary-focus);
    color: var(--primary-hover);
}

.dark-mode-toggle i {
    font-size: 18px;
}

/* Dark mode text color overrides */
[data-theme="dark"] .nav-item {
    color: var(--text-color) !important;
}

[data-theme="dark"] .nav-item:hover {
    background-color: var(--card-bg);
    color: var(--accent-gold, #d4af37) !important;
}

[data-theme="dark"] .nav-item.logout {
    color: var(--danger) !important;
}

[data-theme="dark"] .nav-item.logout:hover {
    background-color: var(--card-bg);
    color: var(--danger) !important;
}

[data-theme="dark"] .logo-link,
[data-theme="dark"] .logo-text {
    color: var(--text-color) !important;
}

[data-theme="dark"] .logo-text::first-letter {
    color: var(--accent-gold, #d4af37) !important;
}

[data-theme="dark"] .welcome-message,
[data-theme="dark"] .welcome-message strong {
    color: var(--text-color) !important;
}

[data-theme="dark"] .footer-content {
    color: var(--text-muted);
}

[data-theme="dark"] .footer-content a {
    color: var(--link-color);
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
