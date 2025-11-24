import { defineStore } from "pinia";

export const useSessionStore = defineStore("session", {
  state: () => ({
    currentUser: {
      fbUser: null,
      isLoggedIn: false,
      email: "",
      loginTime: null,
      isLoading: false,
      isAdmin: false, // new: admin flag for UI/feature gating
    },
  }),
  actions: {
    // Note: added optional `isAdmin` param (defaults to false) so existing callers remain compatible.
    setUser(user, email, isLoggedIn, loginTime, isAdmin) {
      // Log the raw Firebase user object to inspect available fields/claims during development
      // (requested at line 17)
      console.log('SessionStore.setUser: received user from Firebase =>', user);

      this.currentUser.fbUser = user;
      this.currentUser.email = email;
      this.currentUser.isLoggedIn = isLoggedIn;
      this.currentUser.loginTime = loginTime;
      this.currentUser.isLoading = true;
      // Determine admin flag: prefer explicit argument when provided; otherwise infer from user content
      let inferredAdmin = false;
      try {
        if (user && typeof user === 'object') {
          // If caller attached an isAdmin property on the user object
          if (user.isAdmin === true) inferredAdmin = true;

          // Check common locations for custom claims if they were injected into the user object
          // Note: In Firebase client SDK, custom claims are typically accessed via getIdTokenResult(),
          // but some apps attach them onto the user object for convenience.
          if (user?.customClaims?.admin === true) inferredAdmin = true;
          if (user?.claims?.admin === true) inferredAdmin = true;
        }
      } catch (e) {
        // non-fatal; fallback to false
      }
      const adminFlag = typeof isAdmin === 'boolean' ? isAdmin : inferredAdmin;
      this.currentUser.isAdmin = !!adminFlag;
    },

    removeUser() {
      this.currentUser.fbUser = null;
      this.currentUser.email = "";
      this.currentUser.isLoggedIn = false;
      this.currentUser.loginTime = null;
      this.currentUser.isLoading = false;
      this.currentUser.isAdmin = false;
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
    },

    // New helpers for admin state management and queries
    getIsAdmin() {
      return this.currentUser.isAdmin === true;
    },

    setIsAdmin(flag) {
      this.currentUser.isAdmin = !!flag;
    },
  },
});
