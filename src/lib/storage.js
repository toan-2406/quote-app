export const storage = window.storage || {
  get: async (key) => {
    try {
      const val = localStorage.getItem(key);
      return val ? { value: val } : null;
    } catch {
      return null;
    }
  },
  set: async (key, val) => {
    try {
      localStorage.setItem(key, val);
    } catch {}
  },
  delete: async (key) => {
    try {
      localStorage.removeItem(key);
    } catch {}
  },
};
