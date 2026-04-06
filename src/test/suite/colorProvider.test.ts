import * as assert from 'assert';
import * as path from 'path';
import * as vscode from 'vscode';

suite('color provider', () => {
  test('returns color ranges for supported JUCE expressions', async () => {
    const extension = vscode.extensions.getExtension('local.juce-color-picker');
    assert.ok(extension, 'extension should be discoverable');
    await extension?.activate();

    const fixturePath = path.resolve(__dirname, '../../../src/test/fixtures/sample.cpp');
    const document = await vscode.workspace.openTextDocument(vscode.Uri.file(fixturePath));
    await vscode.window.showTextDocument(document);

    const colors = await vscode.commands.executeCommand<vscode.ColorInformation[]>(
      'vscode.executeDocumentColorProvider',
      document.uri
    );

    assert.ok(colors, 'color provider should return results');
    assert.strictEqual(colors?.length, 6);
  });

  test('rewrites in the original JUCE syntax family', async () => {
    const extension = vscode.extensions.getExtension('local.juce-color-picker');
    assert.ok(extension, 'extension should be discoverable');
    await extension?.activate();

    const document = await vscode.workspace.openTextDocument({
      language: 'cpp',
      content: 'auto color = juce::Colour::fromRGB(10, 20, 30);'
    });

    const colors = await vscode.commands.executeCommand<vscode.ColorInformation[]>(
      'vscode.executeDocumentColorProvider',
      document.uri
    );

    assert.ok(colors);
    assert.strictEqual(colors?.length, 1);

    const presentations = await vscode.commands.executeCommand<vscode.ColorPresentation[]>(
      'vscode.executeColorPresentationProvider',
      new vscode.Color(1, 0, 0, 1),
      {
        uri: document.uri,
        range: colors?.[0].range
      }
    );

    assert.ok(presentations);
    assert.strictEqual(presentations?.[0].label, 'juce::Colour::fromRGB(255, 0, 0)');
  });
});