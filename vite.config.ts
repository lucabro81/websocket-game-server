import { defineConfig } from 'vite';
import dts from 'vite-plugin-dts';
import { resolve } from 'path';

export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, 'src/main.ts'),
      name: 'WebsocketGameServer',
      fileName: 'main',
      formats: ['es', 'cjs']
    },
    rollupOptions: {
      external: ['ws', '@types/ws', 'node:path', 'node:events'],
      output: {
        preserveModules: true,
        preserveModulesRoot: 'src'
      }
    },
    sourcemap: true,
    minify: false,
  },
  plugins: [
    dts({
      insertTypesEntry: true,
      rollupTypes: true,
    })
  ],
  resolve: {
    alias: {
      "@": resolve(__dirname, "./src"),
    },
  },
});
