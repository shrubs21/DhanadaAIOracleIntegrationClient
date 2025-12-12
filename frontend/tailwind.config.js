/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,jsx,ts,tsx}', './components/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: '#7c3aed',
      },
      backgroundImage: {
        'radial-glow': 'radial-gradient(closest-side, rgba(124,58,237,0.22), transparent 40%)'
      }
    }
  },
  plugins: [],
}
