import * as vscode from 'vscode';

import {
  clamp01,
  colorToArgb32,
  ParsedColorExpression,
  rgbToHsl,
  rgbToHsv,
  unitToByte
} from './colorModel';

export function createColorPresentation(
  color: vscode.Color,
  expression: ParsedColorExpression,
  range: vscode.Range
): vscode.ColorPresentation {
  const replacement = formatReplacement(color, expression);
  const presentation = new vscode.ColorPresentation(replacement);
  presentation.textEdit = vscode.TextEdit.replace(range, replacement);
  return presentation;
}

function formatReplacement(color: vscode.Color, expression: ParsedColorExpression): string {
  switch (expression.syntax) {
    case 'fromRGB':
      return `${expression.callee}(${formatByte(color.red)}, ${formatByte(color.green)}, ${formatByte(color.blue)})`;
    case 'fromRGBA':
      return `${expression.callee}(${formatByte(color.red)}, ${formatByte(color.green)}, ${formatByte(color.blue)}, ${formatByte(color.alpha)})`;
    case 'fromFloatRGBA':
      return `${expression.callee}(${formatFloat(color.red)}, ${formatFloat(color.green)}, ${formatFloat(color.blue)}, ${formatFloat(color.alpha)})`;
    case 'fromHSVFloatAlpha': {
      const hsv = rgbToHsv(toNormalized(color));
      return `${expression.callee}(${formatFloat(hsv.hue)}, ${formatFloat(hsv.saturation)}, ${formatFloat(hsv.value)}, ${formatFloat(color.alpha)})`;
    }
    case 'fromHSVByteAlpha': {
      const hsv = rgbToHsv(toNormalized(color));
      return `${expression.callee}(${formatFloat(hsv.hue)}, ${formatFloat(hsv.saturation)}, ${formatFloat(hsv.value)}, ${formatByte(color.alpha)})`;
    }
    case 'fromHSLFloatAlpha': {
      const hsl = rgbToHsl(toNormalized(color));
      return `${expression.callee}(${formatFloat(hsl.hue)}, ${formatFloat(hsl.saturation)}, ${formatFloat(hsl.lightness)}, ${formatFloat(color.alpha)})`;
    }
    case 'fromHSLByteAlpha': {
      const hsl = rgbToHsl(toNormalized(color));
      return `${expression.callee}(${formatFloat(hsl.hue)}, ${formatFloat(hsl.saturation)}, ${formatFloat(hsl.lightness)}, ${formatByte(color.alpha)})`;
    }
    case 'constructorRGB':
      return `${expression.callee}(${formatByte(color.red)}, ${formatByte(color.green)}, ${formatByte(color.blue)})`;
    case 'constructorRGBA':
      return `${expression.callee}(${formatByte(color.red)}, ${formatByte(color.green)}, ${formatByte(color.blue)}, ${formatByte(color.alpha)})`;
    case 'constructorFloatAlpha':
      return `${expression.callee}(${formatByte(color.red)}, ${formatByte(color.green)}, ${formatByte(color.blue)}, ${formatFloat(color.alpha)})`;
    case 'constructorHSVFloatAlpha': {
      const hsv = rgbToHsv(toNormalized(color));
      return `${expression.callee}(${formatFloat(hsv.hue)}, ${formatFloat(hsv.saturation)}, ${formatFloat(hsv.value)}, ${formatFloat(color.alpha)})`;
    }
    case 'constructorHSVByteAlpha': {
      const hsv = rgbToHsv(toNormalized(color));
      return `${expression.callee}(${formatFloat(hsv.hue)}, ${formatFloat(hsv.saturation)}, ${formatFloat(hsv.value)}, ${formatByte(color.alpha)})`;
    }
    case 'constructorARGB32':
      return `${expression.callee}(${formatArgbHex(color)})`;
  }
}

function formatByte(value: number): string {
  return String(unitToByte(value));
}

function formatFloat(value: number): string {
  const rounded = clamp01(value);
  const fixed = rounded.toFixed(4).replace(/0+$/, '').replace(/\.$/, '');
  return fixed.length === 0 ? '0' : fixed;
}

function formatArgbHex(color: vscode.Color): string {
  const normalized = toNormalized(color);
  return `0x${colorToArgb32(normalized).toString(16).padStart(8, '0')}`;
}

function toNormalized(color: vscode.Color) {
  return {
    red: clamp01(color.red),
    green: clamp01(color.green),
    blue: clamp01(color.blue),
    alpha: clamp01(color.alpha)
  };
}