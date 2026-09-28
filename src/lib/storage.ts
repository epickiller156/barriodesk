/**
 * Wrapper seguro para localStorage con manejo de errores
 * Previene pantallas en blanco por datos corruptos
 */

export const storage = {
  /**
   * Obtiene un valor del localStorage de forma segura
   * @param key Clave a obtener
   * @param defaultValue Valor por defecto si no existe o hay error
   */
  get<T>(key: string, defaultValue: T): T {
    try {
      const item = localStorage.getItem(key);
      if (item === null) return defaultValue;
      return JSON.parse(item) as T;
    } catch (error) {
      console.warn(`Error leyendo localStorage key "${key}":`, error);
      // Si hay error, eliminar la clave corrupta
      try {
        localStorage.removeItem(key);
      } catch {
        // Ignorar error al eliminar
      }
      return defaultValue;
    }
  },

  /**
   * Guarda un valor en localStorage de forma segura
   * @param key Clave a guardar
   * @param value Valor a guardar
   */
  set<T>(key: string, value: T): boolean {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (error) {
      console.error(`Error guardando localStorage key "${key}":`, error);
      return false;
    }
  },

  /**
   * Elimina una clave del localStorage de forma segura
   * @param key Clave a eliminar
   */
  remove(key: string): void {
    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.error(`Error eliminando localStorage key "${key}":`, error);
    }
  },

  /**
   * Limpia todo el localStorage de forma segura
   */
  clear(): void {
    try {
      localStorage.clear();
    } catch (error) {
      console.error("Error limpiando localStorage:", error);
    }
  },

  /**
   * Verifica si una clave existe y es válida
   * @param key Clave a verificar
   */
  isValid(key: string): boolean {
    try {
      const item = localStorage.getItem(key);
      if (item === null) return false;
      JSON.parse(item); // Intentar parsear
      return true;
    } catch {
      return false;
    }
  },
};

/**
 * Wrapper seguro para sessionStorage con manejo de errores
 */
export const sessionStorage = {
  get<T>(key: string, defaultValue: T): T {
    try {
      const item = window.sessionStorage.getItem(key);
      if (item === null) return defaultValue;
      return JSON.parse(item) as T;
    } catch (error) {
      console.warn(`Error leyendo sessionStorage key "${key}":`, error);
      try {
        window.sessionStorage.removeItem(key);
      } catch {
        // Ignorar
      }
      return defaultValue;
    }
  },

  set<T>(key: string, value: T): boolean {
    try {
      window.sessionStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (error) {
      console.error(`Error guardando sessionStorage key "${key}":`, error);
      return false;
    }
  },

  remove(key: string): void {
    try {
      window.sessionStorage.removeItem(key);
    } catch (error) {
      console.error(`Error eliminando sessionStorage key "${key}":`, error);
    }
  },

  clear(): void {
    try {
      window.sessionStorage.clear();
    } catch (error) {
      console.error("Error limpiando sessionStorage:", error);
    }
  },
};
