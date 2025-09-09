/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#f0f9f3',
          100: '#dcf2e3',
          200: '#bbe5cb',
          300: '#8dd2a8',
          400: '#57b97f',
          500: '#2e7d32',
          600: '#26742a',
          700: '#205d22',
          800: '#1c4a1e',
          900: '#183d1a',
        },
        secondary: {
          50: '#eff6ff',
          100: '#dbeafe', 
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#1976d2',
          600: '#1565c0',
          700: '#0d47a1',
          800: '#1e3a8a',
          900: '#1e40af',
        },
      },
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
  ],
};
