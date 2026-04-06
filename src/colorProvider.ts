import * as vscode from 'vscode';

import { findJuceColorExpressions } from './parser';
import { createColorPresentation } from './presentations';

export const CPP_DOCUMENT_SELECTOR: vscode.DocumentSelector = [
  { language: 'cpp' },
  { language: 'c' }
];

export class JuceDocumentColorProvider implements vscode.DocumentColorProvider {
  provideDocumentColors(document: vscode.TextDocument): vscode.ColorInformation[] {
    return findJuceColorExpressions(document.getText()).map((expression) => {
      const range = new vscode.Range(document.positionAt(expression.start), document.positionAt(expression.end));
      return new vscode.ColorInformation(
        range,
        new vscode.Color(
          expression.color.red,
          expression.color.green,
          expression.color.blue,
          expression.color.alpha
        )
      );
    });
  }

  provideColorPresentations(color: vscode.Color, context: { document: vscode.TextDocument; range: vscode.Range }): vscode.ColorPresentation[] {
    const expressions = findJuceColorExpressions(context.document.getText());
    const targetStart = context.document.offsetAt(context.range.start);
    const targetEnd = context.document.offsetAt(context.range.end);
    const expression = expressions.find((candidate) => candidate.start === targetStart && candidate.end === targetEnd);

    if (expression === undefined) {
      return [];
    }

    return [createColorPresentation(color, expression, context.range)];
  }
}