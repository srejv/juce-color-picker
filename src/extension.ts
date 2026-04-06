import * as vscode from 'vscode';

import { CPP_DOCUMENT_SELECTOR, JuceDocumentColorProvider } from './colorProvider';

export function activate(context: vscode.ExtensionContext): void {
  const provider = new JuceDocumentColorProvider();
  context.subscriptions.push(vscode.languages.registerColorProvider(CPP_DOCUMENT_SELECTOR, provider));
}

export function deactivate(): void {
}