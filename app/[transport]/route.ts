export async function GET(): Promise<Response> {
  return new Response('MCP route works!', {
    status: 200,
    headers: { 'Content-Type': 'text/plain' },
  });
}

export async function POST(): Promise<Response> {
  return new Response('MCP POST route works!', {
    status: 200,
    headers: { 'Content-Type': 'text/plain' },
  });
}

export async function DELETE(): Promise<Response> {
  return new Response('MCP DELETE route works!', {
    status: 200,
    headers: { 'Content-Type': 'text/plain' },
  });
}
