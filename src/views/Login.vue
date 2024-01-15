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
.login-form {
    margin: auto;
    max-width: 600px;
}
.error {
    color: red;
}
</style>
