export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: sessionId } = await params;
  
  // Proxy the Server-Sent Events stream from the NestJS backend
  const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
  
  try {
    const response = await fetch(`${backendUrl}/ai/session/${sessionId}/summary/stream`, {
      method: 'GET',
      headers: {
        'Accept': 'text/event-stream',
      },
    });

    if (!response.ok) {
      return new Response('Backend SSE failed', { status: response.status });
    }

    // Return the response directly as NextJS App Router route handlers support streamed Web Responses natively
    return new Response(response.body, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });

  } catch (error) {
    console.error('Error proxying AI stream', error);
    return new Response('Internal proxy error', { status: 500 });
  }
}
