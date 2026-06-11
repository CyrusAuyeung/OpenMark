import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

function getManualChunk(id: string) {
  const normalizedId = id.split('\\').join('/')

  if (normalizedId.includes('/node_modules/react') || normalizedId.includes('/node_modules/react-dom')) {
    return 'react-vendor'
  }

  if (normalizedId.includes('/node_modules/@uiw/react-codemirror')) {
    return 'editor-react-vendor'
  }

  if (normalizedId.includes('/node_modules/@codemirror/search') || normalizedId.includes('/node_modules/@codemirror/lang-markdown')) {
    return 'editor-tools-vendor'
  }

  if (normalizedId.includes('/node_modules/@lezer')) {
    return 'editor-parser-vendor'
  }

  if (normalizedId.includes('/node_modules/@codemirror/view')) {
    return 'editor-view-vendor'
  }

  if (normalizedId.includes('/node_modules/@codemirror/state')) {
    return 'editor-state-vendor'
  }

  if (normalizedId.includes('/node_modules/@codemirror/language')) {
    return 'editor-language-vendor'
  }

  if (normalizedId.includes('/node_modules/@codemirror/autocomplete')) {
    return 'editor-autocomplete-vendor'
  }

  if (normalizedId.includes('/node_modules/@codemirror/commands')) {
    return 'editor-commands-vendor'
  }

  if (normalizedId.includes('/node_modules/@codemirror')) {
    return 'editor-core-vendor'
  }

  if (normalizedId.includes('/node_modules/markdown-it') || normalizedId.includes('/node_modules/dompurify')) {
    return 'markdown-vendor'
  }

  if (normalizedId.includes('/node_modules/lucide-react')) {
    return 'icons-vendor'
  }

  return undefined
}

// https://vite.dev/config/
export default defineConfig({
  base: './',
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks: getManualChunk,
      },
    },
  },
})
