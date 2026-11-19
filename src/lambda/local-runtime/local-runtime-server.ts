import { createServer, IncomingMessage, ServerResponse } from 'node:http';
import { appointmentsLambdaHandler } from '../handler';

export const INVOKE_PATH_PREFIX = '/2015-03-31/functions/';

export interface LocalLambdaRuntime {
  port: number;
  url: string;
  close: () => Promise<void>;
}

export interface LocalLambdaRuntimeOptions {
  port?: number;
}

const readBody = async (request: IncomingMessage): Promise<string> => {
  const chunks: Buffer[] = [];

  for await (const chunk of request) {
    chunks.push(chunk as Buffer);
  }

  return Buffer.concat(chunks).toString('utf8');
};

const handleRequest = async (
  request: IncomingMessage,
  response: ServerResponse,
): Promise<void> => {
  if (
    request.method !== 'POST' ||
    !request.url?.startsWith(INVOKE_PATH_PREFIX)
  ) {
    response.writeHead(404, { 'content-type': 'application/json' });
    response.end(JSON.stringify({ message: 'Not found' }));
    return;
  }

  try {
    const raw = await readBody(request);
    const event = raw ? JSON.parse(raw) : {};
    const result = await appointmentsLambdaHandler(event);

    response.writeHead(200, { 'content-type': 'application/json' });
    response.end(JSON.stringify(result));
  } catch (error) {
    response.writeHead(500, { 'content-type': 'application/json' });
    response.end(
      JSON.stringify({
        errorMessage:
          error instanceof Error ? error.message : String(error),
      }),
    );
  }
};

export const startLocalLambdaRuntime = async (
  options: LocalLambdaRuntimeOptions = {},
): Promise<LocalLambdaRuntime> => {
  const port = options.port ?? 3001;

  const server = createServer((request, response) => {
    void handleRequest(request, response);
  });

  await new Promise<void>((resolve) => {
    server.listen(port, resolve);
  });

  return {
    port,
    url: `http://localhost:${port}`,
    close: async () => {
      await new Promise<void>((resolve, reject) => {
        server.close((error) => (error ? reject(error) : resolve()));
      });
    },
  };
};
