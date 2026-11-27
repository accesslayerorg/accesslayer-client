import { useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';

export interface OpenApiInfo {
  title?: string;
  version?: string;
  description?: string;
}

export interface OpenApiSchema {
  type?: string;
  format?: string;
  description?: string;
  properties?: Record<string, OpenApiSchema>;
  items?: OpenApiSchema;
  required?: string[];
  enum?: unknown[];
  example?: unknown;
  examples?: Record<string, unknown>;
  default?: unknown;
  nullable?: boolean;
  oneOf?: OpenApiSchema[];
  anyOf?: OpenApiSchema[];
  allOf?: OpenApiSchema[];
  $ref?: string;
  [key: string]: unknown;
}

export interface OpenApiParameter {
  name: string;
  in: 'query' | 'header' | 'path' | 'cookie';
  description?: string;
  required?: boolean;
  schema?: OpenApiSchema;
  example?: unknown;
  [key: string]: unknown;
}

export interface OpenApiMediaType {
  schema?: OpenApiSchema;
  example?: unknown;
  examples?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface OpenApiRequestBody {
  description?: string;
  required?: boolean;
  content?: Record<string, OpenApiMediaType>;
  [key: string]: unknown;
}

export interface OpenApiResponse {
  description?: string;
  content?: Record<string, OpenApiMediaType>;
  headers?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface OpenApiOperation {
  operationId?: string;
  summary?: string;
  description?: string;
  tags?: string[];
  parameters?: OpenApiParameter[];
  requestBody?: OpenApiRequestBody;
  responses?: Record<string, OpenApiResponse>;
  security?: Array<Record<string, string[]>>;
  deprecated?: boolean;
  [key: string]: unknown;
}

export interface OpenApiPathItem {
  summary?: string;
  description?: string;
  parameters?: OpenApiParameter[];
  get?: OpenApiOperation;
  put?: OpenApiOperation;
  post?: OpenApiOperation;
  delete?: OpenApiOperation;
  options?: OpenApiOperation;
  head?: OpenApiOperation;
  patch?: OpenApiOperation;
  trace?: OpenApiOperation;
  [key: string]: unknown;
}

export interface OpenApiTag {
  name: string;
  description?: string;
  [key: string]: unknown;
}

export interface OpenApiSecurityScheme {
  type?: string;
  scheme?: string;
  in?: string;
  name?: string;
  description?: string;
  bearerFormat?: string;
  [key: string]: unknown;
}

export interface OpenApiDocument {
  openapi?: string;
  info?: OpenApiInfo;
  servers?: Array<{ url: string; description?: string }>;
  paths?: Record<string, OpenApiPathItem>;
  components?: {
    schemas?: Record<string, OpenApiSchema>;
    securitySchemes?: Record<string, OpenApiSecurityScheme>;
    [key: string]: unknown;
  };
  tags?: OpenApiTag[];
  security?: Array<Record<string, string[]>>;
  [key: string]: unknown;
}

export const OPENAPI_DOCUMENT_QUERY_KEY = ['openapi-document'] as const;

export const OPENAPI_DOCUMENT_URL = '/v1/openapi.json';

export class OpenApiFetchError extends Error {
  status?: number;

  constructor(message: string, status?: number) {
    super(message);
    this.name = 'OpenApiFetchError';
    this.status = status;
  }
}

async function fetchOpenApiDocument(signal?: AbortSignal): Promise<OpenApiDocument> {
  let response: Response;
  try {
    response = await fetch(OPENAPI_DOCUMENT_URL, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      signal,
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw error;
    }
    throw new OpenApiFetchError(
      error instanceof Error ? error.message : 'Failed to fetch the OpenAPI document',
    );
  }

  if (!response.ok) {
    throw new OpenApiFetchError(
      `Failed to fetch the OpenAPI document (HTTP ${response.status})`,
      response.status,
    );
  }

  let document: unknown;
  try {
    document = await response.json();
  } catch {
    throw new OpenApiFetchError('The OpenAPI document is not valid JSON', response.status);
  }

  if (!document || typeof document !== 'object') {
    throw new OpenApiFetchError('The OpenAPI document is malformed', response.status);
  }

  return document as OpenApiDocument;
}

export interface UseOpenApiDocumentResult {
  document: OpenApiDocument | undefined;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  retry: () => void;
  isFetching: boolean;
}

export function useOpenApiDocument(): UseOpenApiDocumentResult {
  const queryClient = useQueryClient();

  const query = useQuery<OpenApiDocument, Error>({
    queryKey: OPENAPI_DOCUMENT_QUERY_KEY,
    queryFn: ({ signal }) => fetchOpenApiDocument(signal),
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    retry: 1,
    refetchOnWindowFocus: false,
  });

  const retry = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: OPENAPI_DOCUMENT_QUERY_KEY });
  }, [queryClient]);

  return {
    document: query.data,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error ?? null,
    retry,
    isFetching: query.isFetching,
  };
}

export default useOpenApiDocument;