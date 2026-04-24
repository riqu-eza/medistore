"use client";

export default function NotFound() {
  return (
    <main
      style={{
        minHeight: "100vh",
        backgroundColor: "#ffffff",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        fontFamily:
          "'DM Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
        padding: "2rem",
      }}
    >
      {/* Top border accent */}
      <div
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          height: "3px",
          backgroundColor: "#000000",
        }}
      />

      <div
        style={{
          textAlign: "center",
          maxWidth: "480px",
          width: "100%",
        }}
      >
        {/* Logo / Brand */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "10px",
            marginBottom: "64px",
          }}
        >
          <svg
            width="22"
            height="22"
            viewBox="0 0 22 22"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <rect x="9" y="0" width="4" height="22" fill="#000000" />
            <rect x="0" y="9" width="22" height="4" fill="#000000" />
          </svg>
          <span
            style={{
              fontSize: "1.05rem",
              fontWeight: 600,
              letterSpacing: "0.18em",
              textTransform: "uppercase" as const,
              color: "#000000",
            }}
          >
            PharmaTrace
          </span>
        </div>

        {/* Heading */}
        <h1
          style={{
            fontSize: "clamp(2.8rem, 8vw, 5rem)",
            fontWeight: 300,
            letterSpacing: "-0.02em",
            color: "#000000",
            lineHeight: 1.05,
            margin: "0 0 24px",
          }}
        >
          Coming
          <br />
          <span style={{ fontWeight: 700 }}>Soon.</span>
        </h1>

        {/* Thin divider */}
        <div
          style={{
            width: "40px",
            height: "1px",
            backgroundColor: "#000000",
            margin: "0 auto 24px",
          }}
        />

        {/* Subtitle */}
        <p
          style={{
            fontSize: "0.92rem",
            color: "#888888",
            letterSpacing: "0.04em",
            lineHeight: 1.7,
            margin: "0 0 48px",
          }}
        >
          This page is currently being built. <br />
          Check back soon.
        </p>

        {/* Go back button */}
        <button
          onClick={() => window.history.back()}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
            fontSize: "0.8rem",
            fontFamily: "inherit",
            letterSpacing: "0.12em",
            textTransform: "uppercase" as const,
            color: "#ffffff",
            backgroundColor: "#000000",
            border: "none",
            padding: "14px 32px",
            cursor: "pointer",
            borderRadius: "2px",
          }}
        >
          ← Go Back
        </button>
      </div>

      {/* Bottom label */}
      <div
        style={{
          position: "fixed",
          bottom: "28px",
          fontSize: "0.7rem",
          letterSpacing: "0.15em",
          textTransform: "uppercase" as const,
          color: "#cccccc",
        }}
      >
        © {new Date().getFullYear()} PharmaTrace
      </div>
    </main>
  );
}