import { createOpenAI } from "npm:@ai-sdk/openai";

const RUN_ID_HEADER = "X-Lovable-AIG-Run-ID";

export function createResponsesProvider(apiKey: string, initialRunId?: string) {
  let runId = initialRunId?.trim() || undefined;
  const wrappedFetch: typeof fetch = async (input, init) => {
    const headers = new Headers(init?.headers);
    if (runId && !headers.has(RUN_ID_HEADER)) headers.set(RUN_ID_HEADER, runId);
    const response = await fetch(input, { ...init, headers });
    runId = response.headers.get(RUN_ID_HEADER) ?? runId;
    return response;
  };

  const provider = createOpenAI({
    baseURL: "https://ai.gateway.lovable.dev/v1",
    apiKey,
    headers: {
      "Lovable-API-Key": apiKey,
      "X-Lovable-AIG-SDK": "vercel-ai-sdk",
    },
    fetch: wrappedFetch,
  });

  return { provider, getRunId: () => runId };
}

export function getRequestRunId(request: Request) {
  return request.headers.get(RUN_ID_HEADER)?.trim() || undefined;
}

export function responseHeaders(runId?: string) {
  return runId
    ? { [RUN_ID_HEADER]: runId, "Access-Control-Expose-Headers": RUN_ID_HEADER }
    : {};
}