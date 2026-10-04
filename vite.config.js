import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ command, mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  if (command === 'build' && !env.VITE_GAME_DATA_URL) {
    throw new Error('VITE_GAME_DATA_URL is required for production builds.');
  }

  return {
    base: env.BASE_PATH || '/',
    plugins: [react()],
    server: {
      port: 8080
    }
  };
});
