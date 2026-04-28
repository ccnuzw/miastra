/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: {
          950: '#07080a',
          900: '#0c1015',
          800: '#141b24',
          700: '#202a36',
        },
        porcelain: {
          50: '#fffaf0',
          100: '#f7ead4',
          200: '#e9d5ad',
        },
        signal: {
          cyan: '#5eead4',
          blue: '#38bdf8',
          amber: '#fbbf24',
          coral: '#fb7185',
        },
      },
      fontFamily: {
        display: ['Georgia', 'Times New Roman', 'serif'],
        body: ['Avenir Next', 'PingFang SC', 'Hiragino Sans GB', 'sans-serif'],
      },
      boxShadow: {
        glow: '0 0 80px rgba(94, 234, 212, 0.22)',
        card: '0 24px 80px rgba(0, 0, 0, 0.38)',
      },
      backgroundImage: {
        'aurora-radial': 'radial-gradient(circle at 20% 20%, rgba(94, 234, 212, 0.24), transparent 30%), radial-gradient(circle at 80% 8%, rgba(251, 191, 36, 0.18), transparent 28%), radial-gradient(circle at 60% 85%, rgba(251, 113, 133, 0.18), transparent 32%)',
      },
    },
  },
  plugins: [],
}
