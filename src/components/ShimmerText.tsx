import React from "react";

interface ShimmerTextProps {
  text: string;
  gradient?: string;
  animationDuration?: number;
  className?: string;
}

export const ShimmerText: React.FC<ShimmerTextProps> = ({
  text,
  gradient = "linear-gradient(90deg, #334155, #cbd5e1, #334155)",
  animationDuration = 2,
  className = "",
}) => {
  // We're using the keyframes defined in our CSS file
  return (
    <span
      className={`shimmer-text ${className}`}
      style={{
        background: gradient,
        animation: `shimmer ${animationDuration}s linear infinite`,
      }}
    >
      {text}
    </span>
  );
};
