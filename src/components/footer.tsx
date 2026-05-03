import { Link } from "react-router-dom";

const Footer = () => {
  return (
    <footer
      style={{
        width: "100%",
        background: "#0d0d0d",
        fontFamily: "var(--ai-sans, 'Outfit', sans-serif)",
        padding: "2rem clamp(1.5rem, 5vw, 4rem) 1.25rem",
      }}
    >
      {/* ── Main row ── */}
      <div
        className="footer-grid"
        style={{
          maxWidth: "1200px",
          margin: "0 auto",
          display: "grid",
          gridTemplateColumns: "1.6fr 1fr 1fr 1fr",
          gap: "2rem",
          paddingBottom: "1.5rem",
          borderBottom: "1px solid #222",
          marginBottom: "1.25rem",
          alignItems: "start",
        }}
      >
        {/* Brand */}
        <div>
          <Link
            to="/"
            style={{
              fontFamily: "var(--ai-serif, 'DM Serif Display', Georgia, serif)",
              fontSize: "1.25rem",
              color: "#fff",
              textDecoration: "none",
              letterSpacing: "-0.02em",
              display: "inline-flex",
              alignItems: "center",
              gap: "7px",
              marginBottom: "0.6rem",
            }}
          >
            <span style={{ width: "8px", height: "8px", background: "#c8502a", borderRadius: "50%", display: "inline-block" }} />
            InterviewAI
          </Link>
          <p style={{ fontSize: "0.95rem", lineHeight: 1.65, color: "rgba(255,255,255,0.4)", maxWidth: "220px", margin: 0 }}>
            AI-powered interview coaching — prepare smarter, land faster.
          </p>
        </div>

        {/* Col helper */}
        {[
          {
            heading: "Product",
            links: [
              { label: "How it works", href: "/" },
              { label: "Features", href: "/" },
              { label: "Pricing", href: "/" },
              { label: "Dashboard", href: "/generate" },
            ],
          },
          {
            heading: "Roles",
            links: [
              { label: "Engineering", href: "/generate" },
              { label: "Product", href: "/generate" },
              { label: "Design", href: "/generate" },
              { label: "Data & Analytics", href: "/generate" },
            ],
          },
          {
            heading: "Company",
            links: [
              { label: "About", href: "/about" },
              { label: "Blog", href: "/" },
              { label: "Privacy", href: "/" },
              { label: "Terms", href: "/" },
            ],
          },
        ].map((col) => (
          <div key={col.heading}>
            <h4
              style={{
                fontSize: "0.7rem",
                fontWeight: 700,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                color: "rgba(255,255,255,0.9)",
                marginBottom: "0.75rem",
              }}
            >
              {col.heading}
            </h4>
            {col.links.map((item) => (
              <Link
                key={item.label}
                to={item.href}
                style={{
                  display: "block",
                  color: "rgba(255,255,255,0.38)",
                  textDecoration: "none",
                  fontSize: "0.82rem",
                  marginBottom: "0.45rem",
                  transition: "color 0.2s",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.color = "#c8502a")}
                onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(255,255,255,0.38)")}
              >
                {item.label}
              </Link>
            ))}
          </div>
        ))}
      </div>

      {/* ── Bottom bar ── */}
      <div
        style={{
          maxWidth: "1200px",
          margin: "0 auto",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          fontSize: "0.72rem",
          color: "rgba(255,255,255,0.25)",
        }}
      >
        <span>© 2026 InterviewAI. All rights reserved.</span>
        <span>Made with care for job seekers everywhere</span>
      </div>

      <style>{`
        @media (max-width: 768px) {
          .footer-grid { grid-template-columns: 1fr 1fr !important; }
        }
        @media (max-width: 480px) {
          .footer-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </footer>
  );
};

export default Footer;