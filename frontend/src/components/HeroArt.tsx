export function HeroArt({ className }: { className?: string }) {
  return (
    <svg className={className} width="200" height="150" viewBox="0 0 240 180" role="presentation" aria-hidden="true" focusable="false">
      <circle cx="120" cy="92" r="72" fill="#dcfce7" />
      <ellipse cx="56" cy="128" rx="10" ry="22" fill="#86d9a3" transform="rotate(-25 56 128)" />
      <ellipse cx="72" cy="140" rx="8" ry="18" fill="#15803d" transform="rotate(15 72 140)" />
      <rect x="84" y="30" width="72" height="124" rx="14" fill="#ffffff" stroke="#166534" strokeWidth="4" />
      <rect x="108" y="38" width="24" height="5" rx="2.5" fill="#166534" />
      <rect x="94" y="62" width="40" height="18" rx="9" fill="#86d9a3" />
      <rect x="106" y="88" width="40" height="18" rx="9" fill="#166534" />
      <rect x="94" y="114" width="48" height="18" rx="9" fill="#86d9a3" />
      <circle cx="158" cy="52" r="16" fill="#15803d" />
      <path d="M150 52l6 6 10-12" fill="none" stroke="#ffffff" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
 