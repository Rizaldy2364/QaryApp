import { spawn } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const serverDir = resolve(rootDir, 'server');
const isWindows = process.platform === 'win32';

const processes = [
  {
    name: 'api',
    color: '\x1b[36m',
    command: 'pnpm',
    args: ['dev'],
    cwd: serverDir,
  },
  {
    name: 'web',
    color: '\x1b[32m',
    command: 'pnpm',
    args: ['exec', 'vite'],
    cwd: rootDir,
  },
];

const resetColor = '\x1b[0m';
const children = [];
let shuttingDown = false;

function pipeWithPrefix(stream, prefix, target) {
  let buffer = '';
  stream.on('data', (chunk) => {
    buffer += chunk.toString();
    const lines = buffer.split(/\r?\n/);
    buffer = lines.pop() ?? '';
    for (const line of lines) {
      target.write(`${prefix} ${line}\n`);
    }
  });
  stream.on('end', () => {
    if (buffer.length > 0) {
      target.write(`${prefix} ${buffer}\n`);
    }
  });
}

function killChildTree(child) {
  if (!child.pid || child.killed) return;
  if (isWindows) {
    spawn('taskkill', ['/pid', String(child.pid), '/T', '/F'], {
      stdio: 'ignore',
    });
  } else {
    child.kill('SIGTERM');
  }
}

function shutdown(exitCode = 0) {
  if (shuttingDown) return;
  shuttingDown = true;
  for (const child of children) {
    killChildTree(child);
  }
  setTimeout(() => process.exit(exitCode), 150);
}

for (const proc of processes) {
  const command = isWindows ? 'cmd.exe' : proc.command;
  const args = isWindows ? ['/c', proc.command, ...proc.args] : proc.args;
  const child = spawn(command, args, {
    cwd: proc.cwd,
    stdio: ['ignore', 'pipe', 'pipe'],
    env: {
      ...process.env,
      FORCE_COLOR: '1',
    },
  });

  const prefix = `${proc.color}[${proc.name}]${resetColor}`;
  pipeWithPrefix(child.stdout, prefix, process.stdout);
  pipeWithPrefix(child.stderr, prefix, process.stderr);

  child.on('exit', (code) => {
    if (!shuttingDown) {
      const exitCode = typeof code === 'number' ? code : 1;
      process.stderr.write(`${prefix} proses berhenti (kode ${exitCode})\n`);
      shutdown(exitCode);
    }
  });

  children.push(child);
}

process.on('SIGINT', () => shutdown(0));
process.on('SIGTERM', () => shutdown(0));
