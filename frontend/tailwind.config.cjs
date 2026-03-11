const config = {
  content: ['./src/**/*.{html,js,svelte,ts}'],

  plugins: [],

  theme: {
    screens: {
      sm: '480px',
      md: '768px',
      lg: '976px',
      xl: '1440px'
    },
    fontFamily: {
      sans: ['Graphik', 'sans-serif'],
      serif: ['Merriweather', 'serif']
    },
    extend: {
      colors: {
        primary: 'var(--primary)',
        secondary: 'var(--secondary)',
        background: 'var(--background)',
        link: 'var(--link)'
      },
      spacing: {
        128: '32rem',
        144: '36rem'
      },
      borderRadius: {
        '4xl': '2rem'
      }
    }
  }
};

module.exports = config;
