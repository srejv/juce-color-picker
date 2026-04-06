# JUCE Color Picker

This extension adds native VS Code color decorators and color picker edits for literal JUCE colour expressions in C++.

## Supported syntax

- `juce::Colour::fromRGB(r, g, b)`
- `juce::Colour::fromRGBA(r, g, b, a)`
- `juce::Colour::fromFloatRGBA(r, g, b, a)`
- `juce::Colour::fromHSV(h, s, v, a)`
- `juce::Colour::fromHSL(h, s, l, a)`
- `juce::Colour(r, g, b)`
- `juce::Colour(r, g, b, a)`
- `juce::Colour(r, g, b, floatAlpha)`
- `juce::Colour(h, s, v, a)` when the first three literals are floating-point values
- `juce::Colour(0xffe8e2d5)` and equivalent 32-bit ARGB literals

The provider also accepts the unqualified `Colour` and `Colour::...` forms when they appear directly in code.

## Current limits

- Named colours such as `juce::Colours::red` are not supported in v1.
- Macros, variables, constants, and arbitrary expressions are intentionally ignored.
- The parser is text-based, not a full C++ parser. It handles multiline calls and basic comment/string skipping, but it does not evaluate C++ semantics.

## Example

```cpp
inline const juce::Colour windowBackground = juce::Colour::fromRGB(232, 226, 213);
```

Open a C++ file containing supported JUCE colour literals and VS Code should show the inline swatch. Clicking the swatch opens the built-in color picker and rewrites the original JUCE expression in place.