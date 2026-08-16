/**
 * El frontend y la API se publican por el mismo proxy Nginx.
 */
window.SELLO_CONFIG = {
  API_BASE_URL: "/api/v1",
  SWAGGER_URL: "/swagger/",
};

window.API_BASE_URL = window.SELLO_CONFIG.API_BASE_URL;
