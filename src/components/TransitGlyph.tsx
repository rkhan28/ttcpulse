import type { Mode } from "@/lib/data";
import { transitShapes } from "@/lib/transit-glyphs";

/** React wrapper around the shared transit pictograms (bus / streetcar / subway). */
export function TransitGlyph({
  mode,
  body,
  win,
  size = 16,
  className,
}: {
  mode: Mode;
  body: string; // silhouette color
  win: string; // window / headlight color (usually the badge background)
  size?: number;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      aria-hidden
      dangerouslySetInnerHTML={{ __html: transitShapes(mode, body, win) }}
    />
  );
}
