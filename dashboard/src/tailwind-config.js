tailwind.config = {
  theme: {
    extend: {
      colors: {
        night: "#f5f5f7", panel: "#ffffff", panel2: "#f5f5f7", stroke: "#d2d2d7",
        ink: "#1d1d1f", mist: "#6e6e73",
        ember: "#0071e3", coral: "#0a84ff",
        sage: "#1d9a3c", gold: "#ff9500", rose: "#e30000",
      },
      fontFamily: {
        display: ["-apple-system", "BlinkMacSystemFont", '"SF Pro Display"', '"Segoe UI"', "sans-serif"],
        body: ["-apple-system", "BlinkMacSystemFont", '"SF Pro Text"', '"Segoe UI"', "Roboto", "sans-serif"],
      },
      boxShadow: {
        lift: "0 4px 20px rgba(0,0,0,.08)",
        glow: "0 0 24px rgba(0,113,227,.2)",
      },
    },
  },
};
