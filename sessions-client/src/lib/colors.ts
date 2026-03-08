// Dynamic color extraction from album art
// Returns a dominant RGB color as [r, g, b]

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let ColorThief: any = null;

async function getColorThief() {
  if (!ColorThief) {
    const mod = await import("color-thief-browser");
    ColorThief = mod.default ?? mod;
  }
  return ColorThief;
}

export async function getDominantColor(
  imageUrl: string,
): Promise<[number, number, number]> {
  try {
    const ct = await getColorThief();
    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        try {
          const color = ct.getColor(img);
          resolve(color);
        } catch {
          resolve([29, 185, 84]); // fallback: Spotify green
        }
      };
      img.onerror = () => resolve([29, 185, 84]);
      img.src = imageUrl;
    });
  } catch {
    return [29, 185, 84];
  }
}

export function rgbToHsl(
  r: number,
  g: number,
  b: number,
): [number, number, number] {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b),
    min = Math.min(r, g, b);
  let h = 0,
    s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
        break;
      case g:
        h = ((b - r) / d + 2) / 6;
        break;
      case b:
        h = ((r - g) / d + 4) / 6;
        break;
    }
  }
  return [Math.round(h * 360), Math.round(s * 100), Math.round(l * 100)];
}

export function colorToCss(rgb: [number, number, number], alpha = 1): string {
  return `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, ${alpha})`;
}
