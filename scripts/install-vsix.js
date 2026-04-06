const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const packageJsonPath = path.resolve(__dirname, '..', 'package.json');
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
const vsixName = `${packageJson.name}-${packageJson.version}.vsix`;
const vsixPath = path.resolve(__dirname, '..', vsixName);

if (!fs.existsSync(vsixPath)) {
  console.error(`VSIX package not found: ${vsixPath}`);
  console.error('Run "npm run package:vsix" first.');
  process.exit(1);
}

const codeCommand = resolveCodeCommand();

if (codeCommand === undefined) {
  console.error('The VS Code command-line tool is not available.');
  console.error('In VS Code, run "Shell Command: Install \'code\' command in PATH", then retry.');
  console.error(`Or install manually from VS Code using: ${vsixPath}`);
  process.exit(1);
}

const installResult = spawnSync(codeCommand, ['--install-extension', vsixPath, '--force'], {
  stdio: 'inherit',
  shell: process.platform === 'win32'
});

process.exit(installResult.status ?? 1);

function resolveCodeCommand() {
  const candidates = process.platform === 'win32'
    ? [
        'code.cmd',
        'code',
        path.join(process.env.LOCALAPPDATA ?? '', 'Programs', 'Microsoft VS Code', 'bin', 'code.cmd'),
        path.join(process.env['ProgramFiles'] ?? '', 'Microsoft VS Code', 'bin', 'code.cmd'),
        path.join(process.env['ProgramFiles(x86)'] ?? '', 'Microsoft VS Code', 'bin', 'code.cmd')
      ]
    : ['code'];

  for (const candidate of candidates) {
    if (!candidate) {
      continue;
    }

    const commandCheck = spawnSync(candidate, ['--version'], {
      stdio: 'ignore',
      shell: process.platform === 'win32'
    });

    if (commandCheck.status === 0) {
      return candidate;
    }
  }

  return undefined;
}