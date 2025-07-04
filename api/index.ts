import { createMcpServer } from '@vercel/mcp-adapter';

// Import our existing MCP server from the main index file
import { server } from '../src/index.js';

export default createMcpServer(server);