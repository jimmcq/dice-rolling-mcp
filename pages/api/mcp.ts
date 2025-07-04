import { createMcpHandler } from '@vercel/mcp-adapter';

export default createMcpHandler({
  name: 'test-server',
  version: '1.0.0',
  tools: {
    hello: {
      description: 'A simple test tool',
      input_schema: {
        type: 'object',
        properties: {
          name: { type: 'string', description: 'Name to say hello to' },
        },
        required: ['name'],
      },
      async handler({ name }) {
        return {
          content: [{ type: 'text', text: `Hello, ${name}!` }],
        };
      },
    },
  },
  resources: {},
  prompts: {},
});
