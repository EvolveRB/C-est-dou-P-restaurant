// Vector placeholder icon exactly matching the artwork in Image 1
export default function PlaceholderIcon({ className = 'placeholder-icon' }) {
  return (
    <svg
      className={className}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      stroke="currentColor"
      strokeWidth="2.4"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {/* Outer rounded frame */}
      <rect x="6" y="6" width="36" height="36" rx="8" />
      {/* Sun / Moon circle */}
      <circle cx="17" cy="18" r="3.2" />
      {/* Mountains */}
      <path d="M12 36L23 25L30 32" />
      <path d="M26 28L31 23L40 33" />
    </svg>
  );
}
