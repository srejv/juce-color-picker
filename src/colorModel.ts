export type JuceColorSyntax =
  | 'fromRGB'
  | 'fromRGBA'
  | 'fromFloatRGBA'
  | 'fromHSVFloatAlpha'
  | 'fromHSVByteAlpha'
  | 'fromHSLFloatAlpha'
  | 'fromHSLByteAlpha'
  | 'constructorRGB'
  | 'constructorRGBA'
  | 'constructorFloatAlpha'
  | 'constructorHSVFloatAlpha'
  | 'constructorHSVByteAlpha'
  | 'constructorARGB32';

export interface NormalizedColor {
  red: number;
  green: number;
  blue: number;
  alpha: number;
}

export interface ParsedColorExpression {
  syntax: JuceColorSyntax;
  callee: string;
  start: number;
  end: number;
  sourceText: string;
  color: NormalizedColor;
}

export interface NumericLiteral {
  kind: 'int' | 'float';
  value: number;
}

export function clamp01(value: number): number {
  if (Number.isNaN(value)) {
    return 0;
  }

  return Math.min(1, Math.max(0, value));
}

export function clampByte(value: number): number {
  if (Number.isNaN(value)) {
    return 0;
  }

  return Math.min(255, Math.max(0, Math.round(value)));
}

export function byteToUnit(value: number): number {
  return clampByte(value) / 255;
}

export function unitToByte(value: number): number {
  return clampByte(clamp01(value) * 255);
}

export function argb32ToColor(argb: number): NormalizedColor {
  const normalized = argb >>> 0;
  const alpha = (normalized >>> 24) & 0xff;
  const red = (normalized >>> 16) & 0xff;
  const green = (normalized >>> 8) & 0xff;
  const blue = normalized & 0xff;

  return {
    red: byteToUnit(red),
    green: byteToUnit(green),
    blue: byteToUnit(blue),
    alpha: byteToUnit(alpha)
  };
}

export function colorToArgb32(color: NormalizedColor): number {
  const alpha = unitToByte(color.alpha);
  const red = unitToByte(color.red);
  const green = unitToByte(color.green);
  const blue = unitToByte(color.blue);

  return (((alpha << 24) | (red << 16) | (green << 8) | blue) >>> 0);
}

export function hsvToRgb(hue: number, saturation: number, value: number): NormalizedColor {
  const normalizedHue = ((clamp01(hue) % 1) + 1) % 1;
  const normalizedSaturation = clamp01(saturation);
  const normalizedValue = clamp01(value);

  if (normalizedSaturation === 0) {
    return {
      red: normalizedValue,
      green: normalizedValue,
      blue: normalizedValue,
      alpha: 1
    };
  }

  const sector = normalizedHue * 6;
  const index = Math.floor(sector);
  const fraction = sector - index;
  const p = normalizedValue * (1 - normalizedSaturation);
  const q = normalizedValue * (1 - normalizedSaturation * fraction);
  const t = normalizedValue * (1 - normalizedSaturation * (1 - fraction));

  switch (index % 6) {
    case 0:
      return { red: normalizedValue, green: t, blue: p, alpha: 1 };
    case 1:
      return { red: q, green: normalizedValue, blue: p, alpha: 1 };
    case 2:
      return { red: p, green: normalizedValue, blue: t, alpha: 1 };
    case 3:
      return { red: p, green: q, blue: normalizedValue, alpha: 1 };
    case 4:
      return { red: t, green: p, blue: normalizedValue, alpha: 1 };
    default:
      return { red: normalizedValue, green: p, blue: q, alpha: 1 };
  }
}

export function hslToRgb(hue: number, saturation: number, lightness: number): NormalizedColor {
  const normalizedHue = ((clamp01(hue) % 1) + 1) % 1;
  const normalizedSaturation = clamp01(saturation);
  const normalizedLightness = clamp01(lightness);

  if (normalizedSaturation === 0) {
    return {
      red: normalizedLightness,
      green: normalizedLightness,
      blue: normalizedLightness,
      alpha: 1
    };
  }

  const q = normalizedLightness < 0.5
    ? normalizedLightness * (1 + normalizedSaturation)
    : normalizedLightness + normalizedSaturation - normalizedLightness * normalizedSaturation;
  const p = 2 * normalizedLightness - q;

  return {
    red: hueToChannel(p, q, normalizedHue + 1 / 3),
    green: hueToChannel(p, q, normalizedHue),
    blue: hueToChannel(p, q, normalizedHue - 1 / 3),
    alpha: 1
  };
}

export function rgbToHsv(color: NormalizedColor): { hue: number; saturation: number; value: number } {
  const red = clamp01(color.red);
  const green = clamp01(color.green);
  const blue = clamp01(color.blue);
  const max = Math.max(red, green, blue);
  const min = Math.min(red, green, blue);
  const delta = max - min;

  let hue = 0;
  if (delta !== 0) {
    if (max === red) {
      hue = ((green - blue) / delta) % 6;
    } else if (max === green) {
      hue = (blue - red) / delta + 2;
    } else {
      hue = (red - green) / delta + 4;
    }

    hue /= 6;
    if (hue < 0) {
      hue += 1;
    }
  }

  const saturation = max === 0 ? 0 : delta / max;
  return { hue, saturation, value: max };
}

export function rgbToHsl(color: NormalizedColor): { hue: number; saturation: number; lightness: number } {
  const red = clamp01(color.red);
  const green = clamp01(color.green);
  const blue = clamp01(color.blue);
  const max = Math.max(red, green, blue);
  const min = Math.min(red, green, blue);
  const lightness = (max + min) / 2;
  const delta = max - min;

  if (delta === 0) {
    return { hue: 0, saturation: 0, lightness };
  }

  const saturation = lightness > 0.5
    ? delta / (2 - max - min)
    : delta / (max + min);

  let hue: number;
  if (max === red) {
    hue = (green - blue) / delta + (green < blue ? 6 : 0);
  } else if (max === green) {
    hue = (blue - red) / delta + 2;
  } else {
    hue = (red - green) / delta + 4;
  }

  return { hue: hue / 6, saturation, lightness };
}

function hueToChannel(p: number, q: number, hue: number): number {
  let wrappedHue = hue;
  if (wrappedHue < 0) {
    wrappedHue += 1;
  }
  if (wrappedHue > 1) {
    wrappedHue -= 1;
  }

  if (wrappedHue < 1 / 6) {
    return p + (q - p) * 6 * wrappedHue;
  }
  if (wrappedHue < 1 / 2) {
    return q;
  }
  if (wrappedHue < 2 / 3) {
    return p + (q - p) * (2 / 3 - wrappedHue) * 6;
  }

  return p;
}