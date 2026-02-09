module.exports = {
  content: [
    "./*.{php,html}",
    "./admin/**/*.{php,html}",
    "./public/js/**/*.js"
  ],
  theme: {
    extend: {
      colors: {
        'off-white': '#fdfdfd',
        'soft-gray': '#f5f7fa',
        'medium-gray': '#a0aec0',
        'dark-gray': '#2d3748',
        'electric-violet': '#7c3aed',
        'sky-cyan': '#06b6d4',
        'sunset-orange': '#f59e0b',
        'mint-green': '#10b981',
        'coral-pink': '#f43f5e',
      },
      animation: {
        float: 'float 6s ease-in-out infinite',
        glow: 'glow 2s ease-in-out infinite alternate',
        slideUp: 'slideUp 0.5s ease-out',
        fadeIn: 'fadeIn 0.8s ease-out',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-20px)' },
        },
        glow: {
          '0%': { boxShadow: '0 0 20px rgba(124, 58, 237, 0.4)' },
          '100%': { boxShadow: '0 0 40px rgba(6, 182, 212, 0.6)' },
        },
        slideUp: {
          '0%': { transform: 'translateY(100px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
      },
    },
  },
  plugins: [],
}