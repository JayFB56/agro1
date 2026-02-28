// This file is processed at container startup to /env.js
// Values are substituted from container environment variables.
// For local dev (vite), this file is unused; import.meta.env takes precedence in code.
window.__APP_CONFIG__ = {
  VITE_API_URL: "$VITE_API_URL",
  VITE_TENANT_HEADER: "$VITE_TENANT_HEADER"
};

