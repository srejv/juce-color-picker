import {
  argb32ToColor,
  byteToUnit,
  clamp01,
  clampByte,
  hslToRgb,
  hsvToRgb,
  NumericLiteral,
  ParsedColorExpression
} from './colorModel';

const CALLEE_PATTERNS = [
  'juce::Colour::fromFloatRGBA',
  'juce::Colour::fromRGBA',
  'juce::Colour::fromRGB',
  'juce::Colour::fromHSV',
  'juce::Colour::fromHSL',
  'Colour::fromFloatRGBA',
  'Colour::fromRGBA',
  'Colour::fromRGB',
  'Colour::fromHSV',
  'Colour::fromHSL',
  'juce::Colour',
  'Colour'
] as const;

export function findJuceColorExpressions(text: string): ParsedColorExpression[] {
  const codeMask = buildCodeMask(text);
  const results: ParsedColorExpression[] = [];

  for (const callee of CALLEE_PATTERNS) {
    let searchOffset = 0;
    while (searchOffset < text.length) {
      const index = text.indexOf(callee, searchOffset);
      if (index === -1) {
        break;
      }

      searchOffset = index + callee.length;

      if (!isValidCalleeStart(text, index, callee, codeMask)) {
        continue;
      }

      const openParen = findOpenParen(text, index + callee.length, codeMask);
      if (openParen === -1) {
        continue;
      }

      const closeParen = findMatchingParen(text, openParen, codeMask);
      if (closeParen === -1) {
        continue;
      }

      const expressionText = text.slice(index, closeParen + 1);
      const argsText = text.slice(openParen + 1, closeParen);
      const args = splitTopLevelArgs(argsText);
      const parsed = parseExpression(callee, args, index, closeParen + 1, expressionText);

      if (parsed !== undefined) {
        results.push(parsed);
      }

      searchOffset = closeParen + 1;
    }
  }

  return dedupeExpressions(results);
}

function parseExpression(
  callee: string,
  args: string[],
  start: number,
  end: number,
  sourceText: string
): ParsedColorExpression | undefined {
  if (callee.endsWith('fromRGB') && args.length === 3) {
    const channels = parseByteArguments(args);
    if (channels === undefined) {
      return undefined;
    }

    return {
      syntax: 'fromRGB',
      callee,
      start,
      end,
      sourceText,
      color: {
        red: byteToUnit(channels[0]),
        green: byteToUnit(channels[1]),
        blue: byteToUnit(channels[2]),
        alpha: 1
      }
    };
  }

  if (callee.endsWith('fromRGBA') && args.length === 4) {
    const channels = parseByteArguments(args);
    if (channels === undefined) {
      return undefined;
    }

    return {
      syntax: 'fromRGBA',
      callee,
      start,
      end,
      sourceText,
      color: {
        red: byteToUnit(channels[0]),
        green: byteToUnit(channels[1]),
        blue: byteToUnit(channels[2]),
        alpha: byteToUnit(channels[3])
      }
    };
  }

  if (callee.endsWith('fromFloatRGBA') && args.length === 4) {
    const values = parseNumericArguments(args);
    if (values === undefined) {
      return undefined;
    }

    return {
      syntax: 'fromFloatRGBA',
      callee,
      start,
      end,
      sourceText,
      color: {
        red: clamp01(values[0].value),
        green: clamp01(values[1].value),
        blue: clamp01(values[2].value),
        alpha: clamp01(values[3].value)
      }
    };
  }

  if (callee.endsWith('fromHSV') && args.length === 4) {
    const values = parseNumericArguments(args);
    if (values === undefined) {
      return undefined;
    }

    const base = hsvToRgb(values[0].value, values[1].value, values[2].value);
    const alphaKind = values[3].kind === 'int' ? 'fromHSVByteAlpha' : 'fromHSVFloatAlpha';

    return {
      syntax: alphaKind,
      callee,
      start,
      end,
      sourceText,
      color: {
        ...base,
        alpha: values[3].kind === 'int' ? byteToUnit(values[3].value) : clamp01(values[3].value)
      }
    };
  }

  if (callee.endsWith('fromHSL') && args.length === 4) {
    const values = parseNumericArguments(args);
    if (values === undefined) {
      return undefined;
    }

    const base = hslToRgb(values[0].value, values[1].value, values[2].value);
    const alphaKind = values[3].kind === 'int' ? 'fromHSLByteAlpha' : 'fromHSLFloatAlpha';

    return {
      syntax: alphaKind,
      callee,
      start,
      end,
      sourceText,
      color: {
        ...base,
        alpha: values[3].kind === 'int' ? byteToUnit(values[3].value) : clamp01(values[3].value)
      }
    };
  }

  if (callee.endsWith('Colour')) {
    if (args.length === 1) {
      const argb = parseInteger(args[0]);
      if (argb === undefined) {
        return undefined;
      }

      return {
        syntax: 'constructorARGB32',
        callee,
        start,
        end,
        sourceText,
        color: argb32ToColor(argb)
      };
    }

    if (args.length === 3) {
      const rgb = parseByteArguments(args);
      if (rgb === undefined) {
        return undefined;
      }

      return {
        syntax: 'constructorRGB',
        callee,
        start,
        end,
        sourceText,
        color: {
          red: byteToUnit(rgb[0]),
          green: byteToUnit(rgb[1]),
          blue: byteToUnit(rgb[2]),
          alpha: 1
        }
      };
    }

    if (args.length === 4) {
      const values = parseNumericArguments(args);
      if (values === undefined) {
        return undefined;
      }

      if (values.slice(0, 3).every((value) => value.kind === 'int') && values[3].kind === 'int') {
        return {
          syntax: 'constructorRGBA',
          callee,
          start,
          end,
          sourceText,
          color: {
            red: byteToUnit(values[0].value),
            green: byteToUnit(values[1].value),
            blue: byteToUnit(values[2].value),
            alpha: byteToUnit(values[3].value)
          }
        };
      }

      if (values.slice(0, 3).every((value) => value.kind === 'int') && values[3].kind === 'float') {
        return {
          syntax: 'constructorFloatAlpha',
          callee,
          start,
          end,
          sourceText,
          color: {
            red: byteToUnit(values[0].value),
            green: byteToUnit(values[1].value),
            blue: byteToUnit(values[2].value),
            alpha: clamp01(values[3].value)
          }
        };
      }

      if (values.slice(0, 3).every((value) => value.kind === 'float')) {
        const base = hsvToRgb(values[0].value, values[1].value, values[2].value);

        if (values[3].kind === 'int') {
          return {
            syntax: 'constructorHSVByteAlpha',
            callee,
            start,
            end,
            sourceText,
            color: {
              ...base,
              alpha: byteToUnit(values[3].value)
            }
          };
        }

        return {
          syntax: 'constructorHSVFloatAlpha',
          callee,
          start,
          end,
          sourceText,
          color: {
            ...base,
            alpha: clamp01(values[3].value)
          }
        };
      }
    }
  }

  return undefined;
}

function parseByteArguments(args: string[]): number[] | undefined {
  const values = args.map(parseInteger);
  if (values.some((value) => value === undefined)) {
    return undefined;
  }

  return values.map((value) => clampByte(value as number));
}

function parseNumericArguments(args: string[]): NumericLiteral[] | undefined {
  const values = args.map(parseNumericLiteral);
  if (values.some((value) => value === undefined)) {
    return undefined;
  }

  return values as NumericLiteral[];
}

function parseInteger(argument: string): number | undefined {
  const parsed = parseNumericLiteral(argument);
  if (parsed === undefined || parsed.kind !== 'int') {
    return undefined;
  }

  return parsed.value;
}

export function parseNumericLiteral(argument: string): NumericLiteral | undefined {
  const trimmed = argument.trim();
  if (trimmed.length === 0) {
    return undefined;
  }

  const withoutSeparators = trimmed.replace(/'/g, '');

  const hexMatch = withoutSeparators.match(/^([+-]?0[xX][0-9a-fA-F]+)(?:u|ul|ull|l|ll|lu|llu)?$/i);
  if (hexMatch !== null) {
    return {
      kind: 'int',
      value: Number.parseInt(hexMatch[1], 16)
    };
  }

  const intMatch = withoutSeparators.match(/^([+-]?\d+)(?:u|ul|ull|l|ll|lu|llu)?$/i);
  if (intMatch !== null) {
    return {
      kind: 'int',
      value: Number.parseInt(intMatch[1], 10)
    };
  }

  const floatMatch = withoutSeparators.match(/^[+-]?(?:\d+\.\d*|\.\d+|\d+(?:[eE][+-]?\d+)|\d+\.\d*(?:[eE][+-]?\d+)?|\.\d+(?:[eE][+-]?\d+)?)(?:[fFlL])?$/);
  if (floatMatch !== null) {
    return {
      kind: 'float',
      value: Number.parseFloat(withoutSeparators.replace(/[fFlL]$/, ''))
    };
  }

  return undefined;
}

function splitTopLevelArgs(text: string): string[] {
  const codeMask = buildCodeMask(text);
  const args: string[] = [];
  let start = 0;
  let roundDepth = 0;
  let squareDepth = 0;
  let braceDepth = 0;

  for (let index = 0; index < text.length; index += 1) {
    if (!codeMask[index]) {
      continue;
    }

    const char = text[index];
    if (char === '(') {
      roundDepth += 1;
      continue;
    }
    if (char === ')') {
      roundDepth -= 1;
      continue;
    }
    if (char === '[') {
      squareDepth += 1;
      continue;
    }
    if (char === ']') {
      squareDepth -= 1;
      continue;
    }
    if (char === '{') {
      braceDepth += 1;
      continue;
    }
    if (char === '}') {
      braceDepth -= 1;
      continue;
    }

    if (char === ',' && roundDepth === 0 && squareDepth === 0 && braceDepth === 0) {
      args.push(text.slice(start, index).trim());
      start = index + 1;
    }
  }

  const lastArg = text.slice(start).trim();
  if (lastArg.length > 0) {
    args.push(lastArg);
  }

  return args;
}

function findOpenParen(text: string, offset: number, codeMask: boolean[]): number {
  let index = offset;
  while (index < text.length && /\s/.test(text[index])) {
    index += 1;
  }

  if (text[index] !== '(' || !codeMask[index]) {
    return -1;
  }

  return index;
}

function findMatchingParen(text: string, openParen: number, codeMask: boolean[]): number {
  let depth = 0;

  for (let index = openParen; index < text.length; index += 1) {
    if (!codeMask[index]) {
      continue;
    }

    const char = text[index];
    if (char === '(') {
      depth += 1;
    } else if (char === ')') {
      depth -= 1;
      if (depth === 0) {
        return index;
      }
    }
  }

  return -1;
}

function buildCodeMask(text: string): boolean[] {
  const mask = new Array<boolean>(text.length).fill(true);
  let state: 'code' | 'lineComment' | 'blockComment' | 'doubleQuote' | 'singleQuote' = 'code';

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];

    if (state === 'code') {
      if (char === '/' && next === '/') {
        mask[index] = false;
        if (index + 1 < text.length) {
          mask[index + 1] = false;
        }
        state = 'lineComment';
        index += 1;
        continue;
      }

      if (char === '/' && next === '*') {
        mask[index] = false;
        if (index + 1 < text.length) {
          mask[index + 1] = false;
        }
        state = 'blockComment';
        index += 1;
        continue;
      }

      if (char === '"') {
        mask[index] = false;
        state = 'doubleQuote';
        continue;
      }

      if (char === '\'') {
        mask[index] = false;
        state = 'singleQuote';
      }

      continue;
    }

    mask[index] = false;

    if ((state === 'doubleQuote' || state === 'singleQuote') && char === '\\') {
      if (index + 1 < text.length) {
        mask[index + 1] = false;
        index += 1;
      }
      continue;
    }

    if (state === 'lineComment' && char === '\n') {
      state = 'code';
      continue;
    }

    if (state === 'blockComment' && char === '*' && next === '/') {
      if (index + 1 < text.length) {
        mask[index + 1] = false;
        index += 1;
      }
      state = 'code';
      continue;
    }

    if (state === 'doubleQuote' && char === '"') {
      state = 'code';
      continue;
    }

    if (state === 'singleQuote' && char === '\'') {
      state = 'code';
    }
  }

  return mask;
}

function isValidCalleeStart(text: string, index: number, callee: string, codeMask: boolean[]): boolean {
  if (!codeMask[index]) {
    return false;
  }

  const previous = text[index - 1];
  if (callee.startsWith('Colour') && previous === ':') {
    return false;
  }

  if (previous !== undefined && (isIdentifierChar(previous) || previous === ':')) {
    return false;
  }

  return true;
}

function isIdentifierChar(char: string | undefined): boolean {
  return char !== undefined && /[A-Za-z0-9_]/.test(char);
}

function dedupeExpressions(expressions: ParsedColorExpression[]): ParsedColorExpression[] {
  const unique = new Map<string, ParsedColorExpression>();
  for (const expression of expressions) {
    unique.set(`${expression.start}:${expression.end}`, expression);
  }

  return Array.from(unique.values()).sort((left, right) => left.start - right.start);
}