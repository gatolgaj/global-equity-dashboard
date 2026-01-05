/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Terebinth Capital Branding Colors
        terebinth: {
          primary: '#1E3A5F',      // Deep navy blue
          secondary: '#2C5282',    // Medium blue
          accent: '#3182CE',       // Bright blue
          light: '#EBF8FF',        // Light blue bg
          dark: '#1A202C',         // Dark text
        },
        // Performance colors
        performance: {
          positive: '#38A169',     // Green for gains
          negative: '#E53E3E',     // Red for losses
          neutral: '#718096',      // Grey for neutral
        },
        // Chart colors palette
        chart: {
          portfolio: '#3182CE',    // Portfolio line
          benchmark: '#718096',    // Benchmark line
          alpha: '#38A169',        // Alpha/excess return
          sector1: '#4299E1',
          sector2: '#48BB78',
          sector3: '#ECC94B',
          sector4: '#ED8936',
          sector5: '#F56565',
          sector6: '#9F7AEA',
          sector7: '#ED64A6',
          sector8: '#38B2AC',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      boxShadow: {
        'card': '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
        'card-hover': '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
      },
    },
  },
  plugins: [],
}
