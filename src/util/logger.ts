// Logs vão sempre para o stderr: o stdout é reservado ao protocolo MCP.
// O nível é definido pela variável de ambiente BTH_UI_MCP_LOG_LEVEL.

const levels = ['debug', 'info', 'warn', 'error', 'silent'] as const;
type Level = (typeof levels)[number];

function currentLevel(): Level {
  const value = process.env.BTH_UI_MCP_LOG_LEVEL?.toLowerCase();
  return levels.find(level => level === value) ?? 'info';
}

function write(level: Exclude<Level, 'silent'>, message: string, detail?: unknown) {
  if (levels.indexOf(level) < levels.indexOf(currentLevel())) return;

  const suffix = detail === undefined ? '' : ` ${detail instanceof Error ? detail.message : JSON.stringify(detail)}`;
  process.stderr.write(`[bth-ui-mcp] ${level}: ${message}${suffix}\n`);
}

export const logger = {
  debug: (message: string, detail?: unknown) => write('debug', message, detail),
  info: (message: string, detail?: unknown) => write('info', message, detail),
  warn: (message: string, detail?: unknown) => write('warn', message, detail),
  error: (message: string, detail?: unknown) => write('error', message, detail),
};
