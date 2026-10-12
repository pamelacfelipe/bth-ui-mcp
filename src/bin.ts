#!/usr/bin/env node
// entrada stdio
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { createServer } from './server.js';
import { logger } from './util/logger.js';

try {
  const { mcp } = createServer();
  await mcp.connect(new StdioServerTransport());
  logger.info(`servidor iniciado em ${process.cwd()}`);
} catch (error) {
  logger.error('falha ao iniciar o servidor', error);
  process.exit(1);
}
