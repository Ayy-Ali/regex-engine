/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        canvas: "#07111f",
        panel: "#0c1728",
        panelSoft: "#11213a",
        line: "#203756",
        accent: "#5eead4",
        accentWarm: "#f59e0b",
        accentRose: "#fb7185",
        ink: "#edf6ff",
        muted: "#93abc8",
      },
      boxShadow: {
        glow: "0 18px 60px rgba(7, 17, 31, 0.35)",
      },
      fontFamily: {
        display: ["Space Grotesk", "Segoe UI", "sans-serif"],
        body: ["IBM Plex Sans", "Segoe UI", "sans-serif"],
      },
      backgroundImage: {
        aurora:
          "radial-gradient(circle at top left, rgba(94, 234, 212, 0.20), transparent 35%), radial-gradient(circle at bottom right, rgba(245, 158, 11, 0.16), transparent 28%), linear-gradient(180deg, #091423 0%, #060d19 100%)",
      },
    },
  },
  plugins: [],
};

