type ArrowIconProps = {
  direction?: "right" | "down";
  className?: string;
};

export function ArrowIcon({ direction = "right", className }: ArrowIconProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 20 20"
      width="20"
      height="20"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {direction === "down" ? (
        <>
          <path d="M10 3v12" />
          <path d="m5.5 10.5 4.5 4.5 4.5-4.5" />
        </>
      ) : (
        <>
          <path d="M3 10h12" />
          <path d="m10.5 5.5 4.5 4.5-4.5 4.5" />
        </>
      )}
    </svg>
  );
}
