import * as React from 'react';

interface DinoIconProps {
  size?: number;
  className?: string;
}

export function DinoIcon({ size = 20, className }: DinoIconProps) {
  return (
    <svg
      viewBox="8 3 500 500"
      fill="none"
      stroke="currentColor"
      strokeWidth="25"
      strokeLinecap="round"
      strokeLinejoin="round"
      width={size}
      height={size}
      className={className}
    >
      <g transform="translate(18,18)">
        <path d="m 121.603,417.56517 q -38.514064,-162.03964 77.02814,-243.05945 115.54221,-81.019816 231.08442,0 38.51406,81.01981 0,162.03963 h -77.02814 v 81.01982 H 198.63114 Z" />
        <ellipse cx="346.08932" cy="190.84259" rx="23.108444" ry="24.305946" />
        <path d="M 429.71556,255.52553 H 352.68742" />
        <path d="M 109.43085,404.05224 19.929964,361.56176 106.09431,301.95408 32.083478,228.20264 140.79433,211.20016 l -19.98366,-98.87219 92.72026,44.15292 35.10487,-93.948074 65.65867,68.590354" />
      </g>
    </svg>
  );
}
