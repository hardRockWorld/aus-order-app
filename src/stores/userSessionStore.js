import { defineStore } from 'pinia';

export const useSessionStore = defineStore('session', {
  state: () => ({
    currentUser: {
      fbUser: null,
      isLoggedIn: false,
      email: '',
      loginTime: null,
      isLoading: false,
    },
  }),
  actions: {
    setUser(user, email, isLoggedIn, loginTime) {
      this.currentUser.fbUser = user;
      this.currentUser.email = email;
      this.currentUser.isLoggedIn = isLoggedIn;
      this.currentUser.loginTime = loginTime;
      this.currentUser.isLoading = true;
    },

    removeUser() {
      this.currentUser.fbUser = null;
      this.currentUser.email = '';
      this.currentUser.isLoggedIn = false;
      this.currentUser.loginTime = null;
      this.currentUser.isLoading = false;
    },

    getUser() {
      return this.currentUser;
    },

    getUserLoggedIn() {
      return this.currentUser.isLoggedIn;
    },

    getIsLoading() {
      return this.currentUser.isLoading;
    },

    setIsLoading(isLoading) {
      this.currentUser.isLoading = isLoading;
    }
  }, 
});