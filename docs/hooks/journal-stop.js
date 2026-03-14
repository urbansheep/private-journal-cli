'use strict';
// Claude Code Stop hook — writes a private journal entry when Claude finishes a response.
// Copy to ~/.claude/hooks/journal-stop.js and register in ~/.claude/settings.json:
//
//   "Stop": [{ "hooks": [{ "type": "command", "command": "node \"/Users/you/.claude/hooks/journal-stop.js\"" }] }]
//
// Requires: npm install --global private-journal-cli

const { spawnSync } = require('child_process');

function journalAvailable() {
  return spawnSync('which', ['private-journal'], { encoding: 'utf8' }).status === 0;
}

let input = '';
const timeout = setTimeout(() => process.exit(0), 5000);
process.stdin.on('data', chunk => { input += chunk; });
process.stdin.on('end', () => {
  clearTimeout(timeout);
  try {
    const { cwd, session_id, last_assistant_message } = JSON.parse(input);
    if (!last_assistant_message || !journalAvailable()) process.exit(0);
    const content = last_assistant_message.trim().slice(0, 800);
    const tag = session_id ? session_id.slice(0, 8) : 'unknown';
    spawnSync('private-journal', [
      'thoughts',
      '--project-notes', `[session:${tag}] ${content}`,
      '--journal-path', `${cwd}/.private-journal`,
      '--json',
    ], { encoding: 'utf8', timeout: 4000 });
  } catch (_) {}
  process.exit(0);
});
