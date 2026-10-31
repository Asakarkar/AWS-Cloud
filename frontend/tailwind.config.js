/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        cream: '#f8f5ef',
        ink: '#1f2937',
        muted: '#6b7280'
      }
    }
  },
  plugins: []
};
