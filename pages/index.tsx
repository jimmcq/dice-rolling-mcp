import Head from 'next/head';

export default function Home() {
  return (
    <div>
      <Head>
        <title>Dice Rolling MCP Server</title>
        <meta name="description" content="Dice Rolling MCP Server - comprehensive dice rolling with advanced gaming mechanics" />
      </Head>

      <main style={{ fontFamily: 'system-ui, sans-serif', maxWidth: '800px', margin: '2rem auto', padding: '0 1rem', lineHeight: 1.6 }}>
        <h1 style={{ color: '#2d5f2d' }}>🎲 Dice Rolling MCP Server</h1>
        
        <div style={{ background: '#e7f5e7', padding: '1rem', borderRadius: '8px', margin: '1rem 0' }}>
          ✅ <strong>Server Status:</strong> Online and ready for MCP connections
        </div>

        <h2>About</h2>
        <p>This is a Model Context Protocol (MCP) server that provides comprehensive dice rolling capabilities with advanced gaming mechanics.</p>

        <h2>Features</h2>
        <ul>
          <li><strong>Standard Dice:</strong> 1d20, 3d6+2, 2d10-1</li>
          <li><strong>Advantage/Disadvantage:</strong> 2d20kh1, 2d20kl1</li>
          <li><strong>Keep/Drop:</strong> 4d6kh3, 4d6dl1</li>
          <li><strong>Exploding Dice:</strong> 3d6!</li>
          <li><strong>Rerolls:</strong> 4d6r1</li>
          <li><strong>Success Counting:</strong> 5d10&gt;7</li>
        </ul>

        <h2>MCP Tools</h2>
        <ul>
          <li><code>dice_roll</code> - Roll dice using standard notation</li>
          <li><code>dice_validate</code> - Validate dice notation without rolling</li>
        </ul>

        <h2>API Endpoint</h2>
        <div style={{ background: '#f5f5f5', padding: '1rem', borderRadius: '4px', fontFamily: 'monospace' }}>
          MCP Server: /api/mcp
        </div>

        <h2>Usage with Claude Desktop</h2>
        <p>Add this server to your Claude Desktop configuration to enable dice rolling capabilities.</p>

        <hr />
        <p><small>Powered by TypeScript, Next.js, and Vercel</small></p>
      </main>
    </div>
  );
}