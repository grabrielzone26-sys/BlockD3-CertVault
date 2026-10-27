/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
    "./public/index.html"
  ],
  theme: {
    extend: {
      colors: {
        cyan: {
          DEFAULT: '#00E5FF',
          400: '#38EDFF',
          500: '#00E5FF',
          600: '#00B8CC',
        },
        amber: {
          DEFAULT: '#FF8A2B',
          400: '#FFA04D',
          500: '#FF8A2B',
          600: '#D96E14',
        },
        violet: {
          DEFAULT: '#8B5CF6',
          400: '#A78BFA',
          500: '#8B5CF6',
          600: '#7C3AED',
        },
        gold: {
          DEFAULT: '#F5C453',
          400: '#F7D074',
          500: '#F5C453',
          600: '#D4A330',
        },
        green: {
          DEFAULT: '#39FF88',
          400: '#64FF9F',
          500: '#39FF88',
          600: '#20CC66',
        },
        magenta: {
          DEFAULT: '#FF4FD8',
          500: '#FF4FD8',
        },
        dark: {
          800: '#101726',
          850: '#0C121E',
          900: '#0A0E17',
          950: '#05080E',
        },
        primary: {
          50: '#eef6f7',
          100: '#d4e8eb',
          200: '#b0d6dc',
          300: '#84bdc7',
          400: '#00E5FF',
          500: '#00C7DE',
          600: '#00A1B5',
          700: '#007A8A',
          800: '#0A202A',
          900: '#06131A',
        },
      },
      fontFamily: {
        sans: ['Space Grotesk', 'Sora', 'IBM Plex Sans', 'sans-serif'],
        display: ['Space Grotesk', 'Sora', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
  ],
}
