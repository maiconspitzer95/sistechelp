/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        navy: {
          800: '#0f172a',
          900: '#0a1128',
          950: '#050b1a',
        },
        brand: {
          blue: '#1e40af',
          vibrant: '#2563eb',
          light: '#3b82f6',
          cyan: '#06b6d4',
          sky: '#38bdf8',
        },
      },
    },
  },
  plugins: [],
}
