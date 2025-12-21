import React from "react";

export default function Loader({ size = 48 }) {
  return (
    <div className="loaderWrap" style={{ width: size, height: size }}>
      <svg
        className="loaderSvg"
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 32 32"
        width="100%"
        height="100%"
      >
        <defs>
          <mask id="pinCutout">
            <rect
              width="735.072"
              height="332.195"
              fill="white"
              x="-99.68"
              y="-100.62"
            />
            <circle
              cx="230.678"
              cy="223.788"
              r="10"
              transform="matrix(0.398516, 0, 0, 0.364176, -75.940385, -72.91063)"
              fill="black"
            />
          </mask>
        </defs>

        <g className="loaderPlate">
          <ellipse
            cx="16.018"
            cy="26.03"
            rx="12.753"
            ry="5.098"
            stroke="rgba(0, 0, 0, 0.9)"
            fill="rgb(255, 255, 255)"
          />
          <ellipse
            cx="16.018"
            cy="26.03"
            rx="8.768"
            ry="2.913"
            stroke="rgba(0, 0, 0, 0.9)"
            fill="rgb(255, 255, 255)"
          />
        </g>

        <g className="loaderPin">
          <path
            d="M 15.989 0.576 C 11.206 0.576 7.221 4.218 7.221 8.59 C 7.221 14.415 15.989 25.34 15.989 25.34 C 15.989 25.34 24.756 14.415 24.756 8.59 C 24.756 4.218 20.77 0.576 15.989 0.576 Z"
            fill="#4f46e5"
            stroke="rgba(0, 0, 0, 0.9)"
            strokeLinejoin="round"
            mask="url(#pinCutout)"
          />
          <circle
            cx="15.989"
            cy="8.59"
            r="3"
            fill="white"
            stroke="rgba(0, 0, 0, 0.9)"
            strokeWidth="0.5"
          />
        </g>
      </svg>
    </div>
  );
}
