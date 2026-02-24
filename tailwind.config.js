/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,svelte}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Pretendard Variable', 'Pretendard', 'Noto Sans KR', 'system-ui', '-apple-system', 'sans-serif']
      }
    }
  },
  plugins: []
};
