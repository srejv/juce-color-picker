import * as assert from 'assert';

import { findJuceColorExpressions, parseNumericLiteral } from '../../parser';

suite('parser', () => {
  test('parses fromRGB and fromRGBA literals', () => {
    const source = [
      'inline const juce::Colour background = juce::Colour::fromRGB(232, 226, 213);',
      'inline const juce::Colour overlay = juce::Colour::fromRGBA(10, 20, 30, 128);'
    ].join('\n');

    const expressions = findJuceColorExpressions(source);

    assert.strictEqual(expressions.length, 2);
    assert.strictEqual(expressions[0].syntax, 'fromRGB');
    assert.strictEqual(expressions[1].syntax, 'fromRGBA');
    assert.ok(Math.abs(expressions[1].color.alpha - (128 / 255)) < 0.0001);
  });

  test('parses multiline float and argb constructors', () => {
    const source = [
      'const auto tint = juce::Colour::fromHSL(',
      '  0.12f,',
      '  0.4f,',
      '  0.6f,',
      '  0.5f',
      ');',
      'const auto packed = juce::Colour(0xffe8e2d5);'
    ].join('\n');

    const expressions = findJuceColorExpressions(source);

    assert.strictEqual(expressions.length, 2);
    assert.strictEqual(expressions[0].syntax, 'fromHSLFloatAlpha');
    assert.strictEqual(expressions[1].syntax, 'constructorARGB32');
    assert.ok(Math.abs(expressions[1].color.red - (0xe8 / 255)) < 0.0001);
  });

  test('ignores comments strings and non-literal arguments', () => {
    const source = [
      '// juce::Colour::fromRGB(1, 2, 3)',
      'auto text = "juce::Colour::fromRGB(4, 5, 6)";',
      'auto invalid = juce::Colour::fromRGB(redValue, 5, 6);',
      'auto valid = juce::Colour(10, 20, 30, 0.5f);'
    ].join('\n');

    const expressions = findJuceColorExpressions(source);

    assert.strictEqual(expressions.length, 1);
    assert.strictEqual(expressions[0].syntax, 'constructorFloatAlpha');
  });

  test('parses c++-style numeric suffixes', () => {
    assert.deepStrictEqual(parseNumericLiteral('255u'), { kind: 'int', value: 255 });
    assert.deepStrictEqual(parseNumericLiteral('0xffUL'), { kind: 'int', value: 255 });
    assert.deepStrictEqual(parseNumericLiteral('0.75f'), { kind: 'float', value: 0.75 });
  });
});