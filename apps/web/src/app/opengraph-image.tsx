import { ImageResponse } from "next/og"

export const alt = "Grimório AI"
export const size = { width: 1200, height: 630 }
export const contentType = "image/png"

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          background: "#F7F3E8",
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: "200px",
            height: "200px",
            borderRadius: "60px",
            background: "rgba(194, 126, 20, 0.1)",
            border: "4px solid #C27E14",
            marginBottom: "40px",
            position: "relative",
          }}
        >
          {/* Compass Icon SVG representation */}
          <svg
            width="120"
            height="120"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#C27E14"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="10" />
            <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" fill="#C27E14" />
          </svg>
        </div>
        <h1
          style={{
            fontSize: "100px",
            fontWeight: "bold",
            color: "#211D19",
            margin: 0,
            textTransform: "uppercase",
            letterSpacing: "10px",
          }}
        >
          Grimório AI
        </h1>
        <p
          style={{
            fontSize: "30px",
            color: "#C27E14",
            marginTop: "20px",
            textTransform: "uppercase",
            letterSpacing: "15px",
            fontWeight: "bold",
          }}
        >
          Mestre de Tomos
        </p>
      </div>
    ),
    { ...size }
  )
}
