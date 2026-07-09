export const auth = {
  getToken() {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('leadpilot_token');
    }
    return null;
  },

  setToken(token: string) {
    localStorage.setItem('leadpilot_token', token);
  },

  logout() {
    localStorage.removeItem('leadpilot_token');
    window.location.href = '/login';
  },

  isLoggedIn() {
    return !!this.getToken();
  }
};
