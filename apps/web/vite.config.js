import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
    plugins: [react()],
    server: {
        allowedHosts: [
            'tamra-dittographic-darren.ngrok-free.dev',
            '*.ngrok-free.dev',
        ],
        proxy: {
            "/api": {
                target: "http://localhost:4000",
                changeOrigin: true
            }
        }
    }
});
