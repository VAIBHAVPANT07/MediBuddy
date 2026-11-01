/**
 * Three ridges of the Alaknanda valley, drawn rather than photographed: about 2 KB and no
 * network request, which is the point of a product meant for one bar of signal.
 */
export function Ridgeline({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 1440 480"
      preserveAspectRatio="none"
      className={className ?? 'absolute inset-x-0 bottom-0 h-[62%] w-full'}
    >
      <path d="M0 300C180 250 300 322 460 272S760 190 940 250s300 52 500 0v230H0Z" fill="hsl(96 22% 26%)" opacity="0.85" />
      <path d="M0 360c200-60 380 22 560-28s340-52 520 8 240 42 360 0v140H0Z" fill="hsl(99 24% 19%)" />
      <path d="M0 420c220-32 420 14 640-14s360-32 540 8 180 26 260 4v62H0Z" fill="hsl(101 26% 13%)" />
    </svg>
  );
}
