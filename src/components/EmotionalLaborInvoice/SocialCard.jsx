import React, { forwardRef } from "react";

const COLORS = {
  bg: "#FAFAF7",
  gold: "#C49A3C",
  text: "#1A1A1A",
  secondary: "#6B6B6B",
  tertiary: "#9A9A9A",
  border: "#E8E4DF",
  band: "#F5F5F0",
};

const FONT_MONO = '"IBM Plex Mono", "JetBrains Mono", monospace';
const FONT_SANS = '"DM Sans", system-ui, sans-serif';

/**
 * Fixed-dimension render target for social sharing (1080x1350, 4:5 ratio).
 * Uses inline styles for reliable html2canvas capture.
 */
const SocialCard = forwardRef(function SocialCard({ invoice }, ref) {
  if (!invoice) return null;

  const topItems = invoice.line_items.slice(0, 3);
  const total = Number(invoice.total || 0).toFixed(2);

  return (
    <div
      ref={ref}
      style={{
        width: 1080,
        height: 1350,
        backgroundColor: COLORS.bg,
        fontVariantNumeric: "tabular-nums",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      {/* Gold top bar */}
      <div style={{ height: 8, backgroundColor: COLORS.gold }} />

      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "80px 80px 60px",
        }}
      >
        {/* Header */}
        <div>
          <h2
            style={{
              fontFamily: FONT_MONO,
              fontSize: 48,
              fontWeight: 700,
              color: COLORS.text,
              textTransform: "uppercase",
              letterSpacing: "0.02em",
              margin: 0,
            }}
          >
            Emotional Labor Invoice
          </h2>
          <div
            style={{
              width: 60,
              height: 4,
              backgroundColor: COLORS.gold,
              marginTop: 16,
            }}
          />

          {/* From / To */}
          <div style={{ display: "flex", gap: 80, marginTop: 48 }}>
            <div>
              <p
                style={{
                  fontFamily: FONT_MONO,
                  fontSize: 18,
                  textTransform: "uppercase",
                  letterSpacing: "0.2em",
                  color: COLORS.tertiary,
                  margin: "0 0 8px",
                }}
              >
                From
              </p>
              <p
                style={{
                  fontFamily: FONT_SANS,
                  fontSize: 28,
                  fontWeight: 500,
                  color: COLORS.text,
                  margin: 0,
                }}
              >
                {invoice.from}
              </p>
            </div>
            <div>
              <p
                style={{
                  fontFamily: FONT_MONO,
                  fontSize: 18,
                  textTransform: "uppercase",
                  letterSpacing: "0.2em",
                  color: COLORS.tertiary,
                  margin: "0 0 8px",
                }}
              >
                To
              </p>
              <p
                style={{
                  fontFamily: FONT_SANS,
                  fontSize: 28,
                  fontWeight: 500,
                  color: COLORS.text,
                  margin: 0,
                }}
              >
                {invoice.client}
              </p>
            </div>
          </div>
        </div>

        {/* Line items */}
        <div style={{ marginTop: 60 }}>
          <div
            style={{
              borderBottom: `3px solid ${COLORS.text}`,
              paddingBottom: 12,
              marginBottom: 0,
            }}
          >
            <p
              style={{
                fontFamily: FONT_MONO,
                fontSize: 16,
                textTransform: "uppercase",
                letterSpacing: "0.15em",
                color: COLORS.secondary,
                margin: 0,
              }}
            >
              Services Rendered
            </p>
          </div>
          {topItems.map((item, i) => {
            const desc =
              item.description.length > 120
                ? item.description.slice(0, 120) + "\u2026"
                : item.description;
            return (
              <div
                key={i}
                style={{
                  padding: "24px 0",
                  borderBottom: `1px solid ${COLORS.border}`,
                  backgroundColor: i % 2 === 1 ? COLORS.band : "transparent",
                  paddingLeft: i % 2 === 1 ? 16 : 0,
                  paddingRight: i % 2 === 1 ? 16 : 0,
                }}
              >
                <p
                  style={{
                    fontFamily: FONT_SANS,
                    fontSize: 24,
                    color: COLORS.text,
                    lineHeight: 1.5,
                    margin: "0 0 8px",
                  }}
                >
                  {desc}
                </p>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <span
                    style={{
                      fontFamily: FONT_MONO,
                      fontSize: 20,
                      color: COLORS.secondary,
                    }}
                  >
                    {item.quantity} @ $
                    {typeof item.rate === "number"
                      ? item.rate.toFixed(2)
                      : item.rate}
                  </span>
                  <span
                    style={{
                      fontFamily: FONT_MONO,
                      fontSize: 24,
                      fontWeight: 500,
                      color: COLORS.text,
                    }}
                  >
                    $
                    {typeof item.amount === "number"
                      ? item.amount.toFixed(2)
                      : item.amount}
                  </span>
                </div>
              </div>
            );
          })}
          {invoice.line_items.length > 3 && (
            <p
              style={{
                fontFamily: FONT_SANS,
                fontSize: 18,
                color: COLORS.tertiary,
                fontStyle: "italic",
                margin: "16px 0 0",
              }}
            >
              + {invoice.line_items.length - 3} more item
              {invoice.line_items.length - 3 > 1 ? "s" : ""}
            </p>
          )}
        </div>

        {/* Total */}
        <div
          style={{
            borderTop: `3px solid ${COLORS.text}`,
            marginTop: 40,
            paddingTop: 32,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "baseline",
          }}
        >
          <span
            style={{
              fontFamily: FONT_MONO,
              fontSize: 24,
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.15em",
              color: COLORS.text,
            }}
          >
            Total
          </span>
          <span
            style={{
              fontFamily: FONT_MONO,
              fontSize: 56,
              fontWeight: 700,
              color: COLORS.text,
            }}
          >
            ${total}
          </span>
        </div>

        {/* Notes pull quote */}
        {invoice.notes && (
          <div style={{ marginTop: 40 }}>
            <p
              style={{
                fontFamily: FONT_SANS,
                fontSize: 22,
                color: COLORS.secondary,
                fontStyle: "italic",
                lineHeight: 1.6,
                margin: 0,
                borderLeft: `3px solid ${COLORS.gold}`,
                paddingLeft: 20,
              }}
            >
              {invoice.notes}
            </p>
          </div>
        )}

        {/* Footer attribution */}
        <div
          style={{
            marginTop: "auto",
            paddingTop: 40,
            borderTop: `1px solid ${COLORS.border}`,
            textAlign: "center",
          }}
        >
          <p
            style={{
              fontFamily: FONT_SANS,
              fontSize: 18,
              color: COLORS.tertiary,
              margin: "0 0 4px",
            }}
          >
            Generated at the Emotional Labor Exchange
          </p>
          <p
            style={{
              fontFamily: FONT_MONO,
              fontSize: 16,
              color: COLORS.gold,
              margin: 0,
            }}
          >
            builtbyshrey.com/invoice
          </p>
        </div>
      </div>

      {/* Gold bottom bar */}
      <div style={{ height: 4, backgroundColor: COLORS.gold, opacity: 0.4 }} />
    </div>
  );
});

export default SocialCard;
