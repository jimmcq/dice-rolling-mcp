'use client';

export default function HomePage() {
  return (
    <div style={{ 
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', 
      maxWidth: '900px', 
      margin: '50px auto', 
      padding: '20px',
      lineHeight: '1.6',
      color: '#333'
    }}>
      <header style={{ textAlign: 'center', marginBottom: '40px' }}>
        <h1 style={{ 
          fontSize: '2.5rem', 
          margin: '0 0 10px 0',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text'
        }}>
          🎲 Advanced Dice Rolling MCP Server
        </h1>
        <p style={{ fontSize: '1.2rem', color: '#666', margin: '0' }}>
          Comprehensive Model Context Protocol server for tabletop gaming and RPGs
        </p>
      </header>
      
      <section style={{ marginBottom: '40px' }}>
        <h2 style={{ color: '#4a5568', borderBottom: '2px solid #e2e8f0', paddingBottom: '8px' }}>
          🚀 Remote MCP Configuration
        </h2>
        
        <div style={{ 
          background: 'linear-gradient(135deg, #f7fafc 0%, #edf2f7 100%)', 
          border: '1px solid #e2e8f0',
          padding: '20px', 
          borderRadius: '8px', 
          margin: '20px 0' 
        }}>
          <h3 style={{ margin: '0 0 15px 0', color: '#2d3748' }}>Configure in Claude Desktop:</h3>
          <pre style={{ 
            background: '#2d3748',
            color: '#e2e8f0',
            padding: '15px',
            borderRadius: '6px',
            overflow: 'auto',
            fontSize: '14px',
            margin: '0'
          }}>
{`{
  "mcpServers": {
    "dice-rolling-remote": {
      "command": "npx",
      "args": [
        "@modelcontextprotocol/client-stdio", 
        "connect", 
        "<YOUR_DEPLOYMENT_URL>/sse"
      ]
    }
  }
}`}
          </pre>
        </div>
      </section>

      <section style={{ marginBottom: '40px' }}>
        <h2 style={{ color: '#4a5568', borderBottom: '2px solid #e2e8f0', paddingBottom: '8px' }}>
          🛠️ Available Tools & Features
        </h2>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px', marginTop: '20px' }}>
          <div style={{ 
            background: '#fff', 
            border: '1px solid #e2e8f0', 
            padding: '20px', 
            borderRadius: '8px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
          }}>
            <h3 style={{ margin: '0 0 10px 0', color: '#2b6cb0' }}>🎲 dice_roll</h3>
            <p style={{ margin: '0 0 10px 0', fontSize: '14px' }}>Roll dice using standard notation with full gaming support</p>
            <ul style={{ fontSize: '13px', margin: '0', paddingLeft: '16px' }}>
              <li>Basic notation: <code>1d20+5</code></li>
              <li>Advantage/Disadvantage: <code>2d20kh1</code></li>
              <li>Exploding dice: <code>3d6!</code></li>
              <li>Rerolls: <code>4d6r1</code></li>
              <li>Success counting: <code>5d10&gt;7</code></li>
            </ul>
          </div>
          
          <div style={{ 
            background: '#fff', 
            border: '1px solid #e2e8f0', 
            padding: '20px', 
            borderRadius: '8px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
          }}>
            <h3 style={{ margin: '0 0 10px 0', color: '#2b6cb0' }}>✅ dice_validate</h3>
            <p style={{ margin: '0 0 10px 0', fontSize: '14px' }}>Validate and explain dice notation without rolling</p>
            <ul style={{ fontSize: '13px', margin: '0', paddingLeft: '16px' }}>
              <li>Parse complex notation</li>
              <li>Explain mechanics</li>
              <li>Catch syntax errors</li>
              <li>Educational breakdowns</li>
            </ul>
          </div>
        </div>
      </section>

      <section style={{ marginBottom: '40px' }}>
        <h2 style={{ color: '#4a5568', borderBottom: '2px solid #e2e8f0', paddingBottom: '8px' }}>
          📚 Resources & Documentation
        </h2>
        
        <div style={{ marginTop: '20px' }}>
          <div style={{ 
            background: '#f7fafc', 
            border: '1px solid #e2e8f0', 
            padding: '15px', 
            borderRadius: '6px',
            marginBottom: '15px'
          }}>
            <h4 style={{ margin: '0 0 8px 0', color: '#2d3748' }}>📖 dice://guide/notation</h4>
            <p style={{ margin: '0', fontSize: '14px', color: '#4a5568' }}>
              Comprehensive guide to dice notation including advantage, exploding dice, and complex mechanics
            </p>
          </div>
          
          <div style={{ 
            background: '#f7fafc', 
            border: '1px solid #e2e8f0', 
            padding: '15px', 
            borderRadius: '6px',
            marginBottom: '15px'
          }}>
            <h4 style={{ margin: '0 0 8px 0', color: '#2d3748' }}>⚡ dice://guide/quick-reference</h4>
            <p style={{ margin: '0', fontSize: '14px', color: '#4a5568' }}>
              Quick reference for common dice patterns and D&D 5e notation
            </p>
          </div>
        </div>
      </section>

      <section style={{ marginBottom: '40px' }}>
        <h2 style={{ color: '#4a5568', borderBottom: '2px solid #e2e8f0', paddingBottom: '8px' }}>
          💡 Interactive Prompts
        </h2>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '15px', marginTop: '20px' }}>
          <div style={{ 
            background: '#fff', 
            border: '1px solid #e2e8f0', 
            padding: '15px', 
            borderRadius: '6px',
            textAlign: 'center'
          }}>
            <h4 style={{ margin: '0 0 8px 0', color: '#2b6cb0' }}>❓ help</h4>
            <p style={{ margin: '0', fontSize: '13px', color: '#4a5568' }}>Basic notation help and examples</p>
          </div>
          
          <div style={{ 
            background: '#fff', 
            border: '1px solid #e2e8f0', 
            padding: '15px', 
            borderRadius: '6px',
            textAlign: 'center'
          }}>
            <h4 style={{ margin: '0 0 8px 0', color: '#2b6cb0' }}>⚔️ advantage</h4>
            <p style={{ margin: '0', fontSize: '13px', color: '#4a5568' }}>D&D advantage/disadvantage guide</p>
          </div>
          
          <div style={{ 
            background: '#fff', 
            border: '1px solid #e2e8f0', 
            padding: '15px', 
            borderRadius: '6px',
            textAlign: 'center'
          }}>
            <h4 style={{ margin: '0 0 8px 0', color: '#2b6cb0' }}>🎮 examples</h4>
            <p style={{ margin: '0', fontSize: '13px', color: '#4a5568' }}>Common gaming examples and patterns</p>
          </div>
        </div>
      </section>

      <section style={{ marginBottom: '40px' }}>
        <h2 style={{ color: '#4a5568', borderBottom: '2px solid #e2e8f0', paddingBottom: '8px' }}>
          🎯 Advanced Dice Notation Examples
        </h2>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '20px', marginTop: '20px' }}>
          <div>
            <h3 style={{ color: '#2d3748', margin: '0 0 15px 0' }}>D&D 5e Combat</h3>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
              <tbody>
                <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                  <td style={{ padding: '8px 0', fontWeight: 'bold' }}>Normal Attack</td>
                  <td style={{ padding: '8px 0' }}><code>1d20+7</code></td>
                </tr>
                <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                  <td style={{ padding: '8px 0', fontWeight: 'bold' }}>Advantage</td>
                  <td style={{ padding: '8px 0' }}><code>2d20kh1+7</code></td>
                </tr>
                <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                  <td style={{ padding: '8px 0', fontWeight: 'bold' }}>Disadvantage</td>
                  <td style={{ padding: '8px 0' }}><code>2d20kl1+7</code></td>
                </tr>
                <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                  <td style={{ padding: '8px 0', fontWeight: 'bold' }}>Fireball</td>
                  <td style={{ padding: '8px 0' }}><code>8d6</code></td>
                </tr>
                <tr>
                  <td style={{ padding: '8px 0', fontWeight: 'bold' }}>Critical Hit</td>
                  <td style={{ padding: '8px 0' }}><code>2d8+4</code></td>
                </tr>
              </tbody>
            </table>
          </div>
          
          <div>
            <h3 style={{ color: '#2d3748', margin: '0 0 15px 0' }}>Character Generation</h3>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
              <tbody>
                <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                  <td style={{ padding: '8px 0', fontWeight: 'bold' }}>Ability Scores</td>
                  <td style={{ padding: '8px 0' }}><code>4d6kh3</code></td>
                </tr>
                <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                  <td style={{ padding: '8px 0', fontWeight: 'bold' }}>HP Level Up</td>
                  <td style={{ padding: '8px 0' }}><code>1d8</code></td>
                </tr>
                <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                  <td style={{ padding: '8px 0', fontWeight: 'bold' }}>Starting Gold</td>
                  <td style={{ padding: '8px 0' }}><code>4d4*10</code></td>
                </tr>
                <tr>
                  <td style={{ padding: '8px 0', fontWeight: 'bold' }}>Percentile</td>
                  <td style={{ padding: '8px 0' }}><code>1d%</code></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
        
        <div style={{ 
          background: '#fff3cd', 
          border: '1px solid #ffeaa7', 
          padding: '15px', 
          borderRadius: '6px',
          marginTop: '20px'
        }}>
          <p style={{ margin: '0', fontSize: '14px', color: '#856404' }}>
            <strong>⚠️ Important:</strong> For D&D 5e advantage, always use <code>2d20kh1</code> (NOT <code>2d20</code>). 
            The latter adds both dice together (2-40 range) instead of keeping the higher roll (1-20 range).
          </p>
        </div>
      </section>

      <section style={{ marginBottom: '40px' }}>
        <h2 style={{ color: '#4a5568', borderBottom: '2px solid #e2e8f0', paddingBottom: '8px' }}>
          🌐 Protocol Endpoints
        </h2>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px', marginTop: '20px' }}>
          <div style={{ 
            background: '#f0fff4', 
            border: '1px solid #9ae6b4', 
            padding: '15px', 
            borderRadius: '6px',
            textAlign: 'center'
          }}>
            <h4 style={{ margin: '0 0 8px 0', color: '#22543d' }}>/sse</h4>
            <p style={{ margin: '0', fontSize: '13px', color: '#2f855a' }}>Server-Sent Events transport</p>
          </div>
          
          <div style={{ 
            background: '#f0f4ff', 
            border: '1px solid #a3bffa', 
            padding: '15px', 
            borderRadius: '6px',
            textAlign: 'center'
          }}>
            <h4 style={{ margin: '0 0 8px 0', color: '#2c5282' }}>/websocket</h4>
            <p style={{ margin: '0', fontSize: '13px', color: '#3182ce' }}>WebSocket transport</p>
          </div>
          
          <div style={{ 
            background: '#fef5e7', 
            border: '1px solid #f6d55c', 
            padding: '15px', 
            borderRadius: '6px',
            textAlign: 'center'
          }}>
            <h4 style={{ margin: '0 0 8px 0', color: '#744210' }}>/http</h4>
            <p style={{ margin: '0', fontSize: '13px', color: '#a16207' }}>HTTP transport</p>
          </div>
        </div>
      </section>

      <footer style={{ 
        textAlign: 'center', 
        paddingTop: '30px', 
        borderTop: '1px solid #e2e8f0',
        color: '#718096'
      }}>
        <p style={{ margin: '0 0 10px 0' }}>
          🔗 <a 
            href="https://github.com/jimmcq/dice-rolling-mcp" 
            style={{ color: '#3182ce', textDecoration: 'none' }}
            onMouseOver={(e) => e.target.style.textDecoration = 'underline'}
            onMouseOut={(e) => e.target.style.textDecoration = 'none'}
          >
            View on GitHub
          </a>
        </p>
        <p style={{ margin: '0', fontSize: '14px' }}>
          Built with ❤️ for tabletop gaming communities
        </p>
      </footer>
    </div>
  );
}