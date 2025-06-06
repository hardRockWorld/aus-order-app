<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import {browserSessionPersistence, setPersistence, signInWithEmailAndPassword} from "firebase/auth";
import { useSessionStore } from '@/stores/userSessionStore';
import { auth } from '@/fb';

const router = useRouter();
const { setUser, getIsLoading } = useSessionStore();
const user = auth.currentUser;
const errorMessage = ref('');

const emptyLoginRequest = {
    email: '',
    password: '',
}

const loginRequest = ref({...emptyLoginRequest, error: null});

const login = async (email, password) => {
  setPersistence(auth, browserSessionPersistence)
      .then(() => {
        signInWithEmailAndPassword(auth, email, password)
            .then(() => {
                console.log('user is loggedin: ');
                setUser(user, email=email, true, (new Date()).getTime());

                // Instead of showing the order list page, show dashboard instead
                router.push('/dashboard');
            })
            .catch((error) => {
              console.log(error);
              switch (error.code) {
                case 'auth/invalid-email':
                    errorMessage.value = 'Email address is invalid.';
                    break;
                case 'auth/user-not-found':
                case 'auth/wrong-password':
                    errorMessage.value = 'Email/password is wrong.';
                    break;
              }
            });
      });
}
</script>

<template>
    <section>
        <form class="login-form" @submit.prevent="login(loginRequest.email, loginRequest.password)">
            <article>
                <header>
                    <h5>Login</h5>
                </header>

                <label for="email">Email</label>
                <input type="email" v-if="null != loginRequest.error" v-model="loginRequest.email" :aria-invalid="null != loginRequest.error" id="email" name="email" placeholder="Email" required>
                <input type="email" v-if="null == loginRequest.error" v-model="loginRequest.email" id="email" name="email" placeholder="Email" required>

                <label for="password">Password</label>
                <input type="password" v-if="null != loginRequest.error" v-model="loginRequest.password" :aria-invalid="null != loginRequest.error" id="password" name="password" placeholder="Password" required>
                <input type="password" v-if="null == loginRequest.error" v-model="loginRequest.password" id="password" name="password" placeholder="Password" required>
                <small class="error" v-if="loginRequest.error">Login unsuccessful</small>

                <footer>
                    <button :aria-busy="getIsLoading" type="submit">Login</button>
                </footer>
            </article>

        </form>
    </section>
</template>

<style scoped>
section {
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 1rem;
    background: var(--background-color);
    color: var(--text-color);
    transition: all 0.3s ease;
}

.login-form {
    width: 100%;
    max-width: 500px;
    margin: 2rem auto;
    padding: 2px;
    background-color: var(--background-color);
    border-radius: 24px;
    box-shadow: 0 8px 32px rgba(10, 61, 10, 0.12);
    border: 1px solid var(--border-color);
    backdrop-filter: blur(8px);
    transform: translateY(0);
    transition: all 0.3s ease;
}

article {
    padding: clamp(2rem, 5vw, 3rem);
    background-color: var(--background-color);
    border-radius: 24px;
    color: var(--text-color);
}

header {
    margin-bottom: 2rem;
}

/* Dark mode specific styles */
[data-theme="dark"] section {
    background-color: var(--background-color);
}

[data-theme="dark"] .login-form {
    background-color: var(--background-color);
    border-color: #404040;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.25);
}

[data-theme="dark"] article {
    background-color: var(--background-color);
}

[data-theme="dark"] header {
    background-color: var(--background-color);
    border-bottom-color: #404040;
}

[data-theme="dark"] input {
    background-color: #2a2a2a;
    border-color: #404040;
    color: #ffffff;
}

[data-theme="dark"] input::placeholder {
    color: #888888 !important;
}

[data-theme="dark"] footer {
    background-color: var(--background-color);
}

[data-theme="dark"] button {
    color: #2c5f2d;
}

/* Form element styles */
input {
    width: 100%;
    padding: 12px 16px;
    margin-bottom: 1.5rem;
    border-radius: 8px;
    background-color: var(--background-color);
    border: 1px solid var(--border-color);
    color: var(--text-color);
    font-size: 1rem;
    transition: all 0.3s ease;
}

[data-theme="dark"] input {
    background-color: #2a2a2a;
    border-color: #404040;
    color: #ffffff !important;
}

[data-theme="dark"] input::placeholder {
    color: #888888 !important;
}

label {
    display: block;
    margin-bottom: 0.5rem;
    color: var(--text-color);
    font-weight: 600;
    font-size: 0.95rem;
}

h5 {
    font-size: 1.75rem;
    margin: 0;
    color: var(--text-color);
    text-align: center;
    font-weight: 600;
}

button {
    width: 100%;
    padding: 14px;
    background-color: var(--primary);
    color: white;
    border: none;
    border-radius: 8px;
    font-weight: 600;
    font-size: 1rem;
    cursor: pointer;
    transition: all 0.3s ease;
}

button:hover {
    background-color: var(--primary-dark);
    transform: translateY(-1px);
}

.error {
    color: #dc3545;
    font-weight: 500;
    font-size: 0.875rem;
    margin-top: -1rem;
    margin-bottom: 1.25rem;
    display: block;
    padding: 0.5rem;
    background-color: rgba(220, 53, 69, 0.1);
    border-radius: 8px;
    text-align: center;
}

footer {
    margin-top: 1.5rem;
    padding-top: 1.5rem;
    border-top: 1px solid var(--border-color);
    transition: all 0.3s ease;
}

/* Mobile Styles */
@media (max-width: 480px) {
    section {
        padding: 1rem;
        align-items: flex-start;
    }

    .login-form {
        margin: 1rem;
        border-radius: 20px;
    }

    article {
        padding: 1.5rem;
    }

    input, button {
        margin-bottom: 1rem;
    }
}

/* Tablet/iPad Styles */
@media (min-width: 481px) and (max-width: 1024px) {
    .login-form {
        max-width: min(600px, 90%);
        margin: 2rem;
    }

    input, button {
        font-size: 1rem;
    }
}

/* Laptop/Desktop Styles */
@media (min-width: 1025px) {
    .login-form {
        max-width: 550px;
    }

    article {
        padding: 3rem;
    }
}

/* Large Desktop Screens */
@media (min-width: 1400px) {
    .login-form {
        max-width: 600px;
    }
}

/* For devices with touch support */
@media (hover: none) {
    input, button {
        font-size: 16px;
    }

    .login-form:hover {
        transform: none;
        box-shadow: 0 8px 32px rgba(10, 61, 10, 0.12);
    }
}

/* Handle iPad Pro and similar devices in landscape */
@media (min-width: 1024px) and (orientation: landscape) {
    section {
        min-height: 100dvh; /* Use dynamic viewport height for better mobile support */
    }
}
</style>
