import { createServer, type ServerResponse } from "node:http";
import { expect, it } from "vitest";
import { stageFetch } from "./http";

for (const cancel of [false, true]) {
  it(`${cancel ? "cancels" : "times out"} a response that sends headers but stalls its JSON body`, async () => {
    let startBody!: (response: ServerResponse) => void;
    const headersSent = new Promise<ServerResponse>((resolve) => {
      startBody = resolve;
    });
    const server = createServer((_request, response) => {
      response.writeHead(200, { "Content-Type": "application/json" });
      response.write('{"status":');
      startBody(response);
    });
    await new Promise<void>((resolve) =>
      server.listen(0, "127.0.0.1", resolve),
    );
    const address = server.address();
    if (!address || typeof address === "string")
      throw new Error("Missing test address");
    const controller = new AbortController();
    try {
      const pending = stageFetch(
        `http://127.0.0.1:${address.port}`,
        controller.signal,
        cancel ? 8000 : 150,
      );
      const assertion = expect(pending).rejects.toMatchObject({
        name: cancel ? "AbortError" : "TimeoutError",
      });
      await headersSent;
      if (cancel) controller.abort();
      await assertion;
    } finally {
      server.closeAllConnections();
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  });
}
