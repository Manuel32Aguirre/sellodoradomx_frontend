/**
 * Configuración del frontend — edita esto en la EC2.
 * Debe apuntar a la IP/dominio público del BACKEND (puerto 8088).
 */
window.SELLO_CONFIG = {
  // Ejemplo en EC2: "http://3.23.51.132:8088/api/v1"
  API_BASE_URL: "http://3.23.51.132:8088/api/v1",
  // Documentación Swagger del backend
  SWAGGER_URL: "http://3.23.51.132:8088/swagger-ui.html",
};

window.API_BASE_URL = window.SELLO_CONFIG.API_BASE_URL;
