/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#1976D2',
          hover: '#1565C0',
          light: '#E3F2FD',
        },
        secondary: {
          DEFAULT: '#2E9E6F',
          hover: '#26875E',
          light: '#E8F5E9',
        },
        navy: {
          DEFAULT: '#17324D',
          dark: '#0E1F30',
          light: '#244565',
        },
        background: '#F4F9FC',
        card: '#FFFFFF',
        border: '#D9E3EA',
        foreground: '#17324D',
        muted: {
          DEFAULT: '#F4F9FC',
          foreground: '#5A7184',
        },
        success: {
          DEFAULT: '#28A745',
          light: '#D4EDDA',
        },
        warning: {
          DEFAULT: '#F4A62A',
          light: '#FFF3CD',
        },
        destructive: {
          DEFAULT: '#D9534F',
          light: '#F8D7DA',
        },
      },
      fontFamily: {
        heading: ['Inter', 'Roboto', 'sans-serif'],
        sans: ['Inter', 'Roboto', 'sans-serif'],
      },
      boxShadow: {
        'card': '0 2px 8px -2px rgba(23, 50, 77, 0.08), 0 1px 4px -1px rgba(23, 50, 77, 0.04)',
        'card-hover': '0 12px 24px -6px rgba(23, 50, 77, 0.12), 0 4px 12px -2px rgba(23, 50, 77, 0.06)',
        'primary': '0 4px 14px 0 rgba(25, 118, 210, 0.35)',
        'secondary': '0 4px 14px 0 rgba(46, 158, 111, 0.35)',
      },
      borderRadius: {
        'xl': '0.75rem',
        '2xl': '1rem',
        '3xl': '1.5rem',
      }
    },
  },
  plugins: [],
}
