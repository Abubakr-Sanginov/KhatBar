// Minimal no-op worker so stale browser registrations do not receive a 404.
self.addEventListener("install", () => self.skipWaiting())
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()))
