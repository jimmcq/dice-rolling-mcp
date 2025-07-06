export async function GET(): Promise<Response> {
  return new Response('Test route works!', {
    status: 200,
    headers: { 'Content-Type': 'text/plain' },
  });
}

export async function POST(): Promise<Response> {
  return new Response('POST test route works!', {
    status: 200,
    headers: { 'Content-Type': 'text/plain' },
  });
}
