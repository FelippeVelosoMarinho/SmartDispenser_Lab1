/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
    "./.storybook/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      spacing: {
        // Pillar Design System spacing scale (4px base grid)
        // Note: Tailwind's default spacing (0, 0.5, 1.5, 2.5, etc.) is still available
        // These custom values add to the defaults to ensure design token consistency
        0: 'var(--space-0)',   // 0
        1: 'var(--space-1)',   // 4px
        2: 'var(--space-2)',   // 8px
        3: 'var(--space-3)',   // 12px
        4: 'var(--space-4)',   // 16px
        5: 'var(--space-5)',   // 20px
        6: 'var(--space-6)',   // 24px
        7: 'var(--space-7)',   // 32px
        8: 'var(--space-8)',   // 40px
        9: 'var(--space-9)',   // 56px
        10: 'var(--space-10)', // 72px
        11: 'var(--space-11)', // 96px

        // Common fractional values aligned to 4px grid
        12: '3rem',    // 48px (space-6 * 2)
        14: '3.5rem',  // 56px (same as space-9, for consistency)
        16: '4rem',    // 64px
        20: '5rem',    // 80px
        24: '6rem',    // 96px (same as space-11)
        32: '8rem',    // 128px
        40: '10rem',   // 160px
        48: '12rem',   // 192px
        56: '14rem',   // 224px
        64: '16rem',   // 256px
      },
    },
  },
}
