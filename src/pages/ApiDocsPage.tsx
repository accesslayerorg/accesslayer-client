import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

interface OpenAPISchema {
  type?: string;
  format?: string;
  description?: string;
  example?: unknown;
  default?: unknown;
  enum?: unknown[];
  items?: OpenAPISchema;
  properties?: Record<string, OpenAPISchema>;
  required?: string[];
  oneOf?: OpenAPISchema[];
  anyOf?: OpenAPISchema[];
  allOf?: OpenAPISchema[];
  $ref?: string;
  additionalProperties?: boolean | OpenAPISchema;
}

interface OpenAPIMediaType {
  schema?: OpenAPISchema;
  example?: unknown;
  examples?: Record<string, { value?: unknown; summary?: string }>;
}

interface OpenAPIParameter {
  name: string;
  in: 'query' | 'header' | 'path' | 'cookie';
  required?: boolean;
  description?: string;
  schema?: OpenAPISchema;
  example?: unknown;
}

interface OpenAPIRequestBody {
  required?: boolean;
  description?: string;
  content?: Record<string, OpenAPIMediaType>;
}

interface OpenAPIResponse {
  description?: string;
  headers?: Record<string, { description?: string; schema?: OpenAPISchema }>;
  content?: Record<string, OpenAPIMediaType>;
}

interface OpenAPIOperation {
  operationId?: string;
  summary?: string;
  description?: string;
  tags?: string[];
  parameters?: OpenAPIParameter[];
  requestBody?: OpenAPIRequestBody;
  responses?: Record<string, OpenAPIResponse>;
  security?: Array<Record<string, string[]>>;
  'x-rate-limit'?: string | { limit?: number; window?: string };
}

interface OpenAPIPathItem {
  get?: OpenAPIOperation;
  post?: OpenAPIOperation;
  put?: OpenAPIOperation;
  patch?: OpenAPIOperation;
  delete?: OpenAPIOperation;
  head?: OpenAPIOperation;
  options?: OpenAPIOperation;
  parameters?: OpenAPIParameter[];
}

interface OpenAPIDocument {
  openapi?: string;
  info?: { title?: string; version?: string; description?: string };
  servers?: Array<{ url: string; description?: string }>;
  paths?: Record<string, OpenAPIPathItem>;
  components?: {
    schemas?: Record<string, OpenAPISchema>;
    securitySchemes?: Record<string, { type?: string; scheme?: string; name?: string; in?: string; description?: string }>;
  };
  tags?: Array<{ name: string; description?: string }>;
}

type HttpMethod = 'get' | 'post' | 'put' | 'patch' | 'delete' | 'head' | 'options';

interface OperationEntry {
  id: string;
  method: HttpMethod;
  path: string;
  tag: string;
  summary: string;
  operation: OpenAPIOperation;
  pathParameters: OpenAPIParameter[];
}

interface TryItResult {
  status: number;
  statusText: string;
  headers: Array<[string, string]>;
  body: string;
  durationMs: number;
}

/* ------------------------------------------------------------------ */
/* Constants                                                           */
/* ------------------------------------------------------------------ */

const HTTP_METHODS: HttpMethod[] = ['get', 'post', 'put', 'patch', 'delete', 'head', 'options'];

const METHOD_COLORS: Record<HttpMethod, string> = {
  get: '#0b7285',
  post: '#2b8a3e',
  put: '#e67700',
  patch: '#9c36b5',
  delete: '#c92a2a',
  head: '#495057',
  options: '#495057',
};

const API_KEY_PLACEHOLDER = '<YOUR_API_KEY>';

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

function resolveRef(doc: OpenAPIDocument | null, schema?: OpenAPISchema): OpenAPISchema | undefined {
  if (!schema) return undefined;
  if (schema.$ref && doc?.components?.schemas) {
    const name = schema.$ref.split('/').pop();
    if (name && doc.components.schemas[name]) {
      return doc.components.schemas[name];
    }
  }
  return schema;
}

function schemaExample(doc: OpenAPIDocument | null, schema?: OpenAPISchema, depth = 0): unknown {
  if (!schema || depth > 6) return undefined;
  const resolved = resolveRef(doc, schema);
  if (!resolved) return undefined;
  if (resolved.example !== undefined) return resolved.example;
  if (resolved.default !== undefined) return resolved.default;
  if (resolved.enum && resolved.enum.length > 0) return resolved.enum[0];
  if (resolved.oneOf && resolved.oneOf.length > 0) return schemaExample(doc, resolved.oneOf[0], depth + 1);
  if (resolved.anyOf && resolved.anyOf.length > 0) return schemaExample(doc, resolved.anyOf[0], depth + 1);
  if (resolved.allOf && resolved.allOf.length > 0) {
    const merged: Record<string, unknown> = {};
    for (const part of resolved.allOf) {
      const value = schemaExample(doc, part, depth + 1);
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        Object.assign(merged, value as Record<string, unknown>);
      }
    }
    return merged;
  }
  switch (resolved.type) {
    case 'object':
      if (resolved.properties) {
        const obj: Record<string, unknown> = {};
        for (const [key, prop] of Object.entries(resolved.properties)) {
          obj[key] = schemaExample(doc, prop, depth + 1);
        }
        return obj;
      }
      return {};
    case 'array':
      return resolved.items ? [schemaExample(doc, resolved.items, depth + 1)] : [];
    case 'string':
      if (resolved.format === 'date-time') return new Date().toISOString();
      if (resolved.format === 'date') return new Date().toISOString().slice(0, 10);
      if (resolved.format === 'email') return 'user@example.com';
      if (resolved.format === 'uuid') return '00000000-0000-0000-0000-000000000000';
      return 'string';
    case 'integer':
    case 'number':
      return 0;
    case 'boolean':
      return true;
    default:
      return undefined;
  }
}

function mediaTypeExample(doc: OpenAPIDocument | null, media?: OpenAPIMediaType): unknown {
  if (!media) return undefined;
  if (media.example !== undefined) return media.example;
  if (media.examples) {
    const first = Object.values(media.examples)[0];
    if (first && first.value !== undefined) return first.value;
  }
  return schemaExample(doc, media.schema);
}

function pickJsonMedia(content?: Record<string, OpenAPIMediaType>): OpenAPIMediaType | undefined {
  if (!content) return undefined;
  if (content['application/json']) return content['application/json'];
  const key = Object.keys(content).find((k) => k.includes('json'));
  return key ? content[key] : Object.values(content)[0];
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

function operationAnchor(entry: OperationEntry): string {
  return `${entry.method}-${slugify(entry.path)}`;
}

function buildCurl(entry: OperationEntry, baseUrl: string, body: string, apiKey: string): string {
  const url = `${baseUrl}${entry.path}`;
  const lines = [`curl -X ${entry.method.toUpperCase()} '${url}'`];
  lines.push(`  -H 'Authorization: Bearer ${apiKey || API_KEY_PLACEHOLDER}'`);
  if (body) {
    lines.push(`  -H 'Content-Type: application/json'`);
    lines.push(`  -d '${body.replace(/'/g, "'\\''")}'`);
  }
  return lines.join(' \\\n');
}

function buildTypeScript(entry: OperationEntry, baseUrl: string, body: string): string {
  const url = `${baseUrl}${entry.path}`;
  const init: string[] = [];
  init.push(`  method: '${entry.method.toUpperCase()}',`);
  init.push(`  headers: {`);
  init.push(`    Authorization: \`Bearer \${apiKey}\`,`);
  if (body) init.push(`    'Content-Type': 'application/json',`);
  init.push(`  },`);
  if (body) init.push(`  body: JSON.stringify(${body}),`);
  return [
    `const apiKey = process.env.API_KEY ?? '${API_KEY_PLACEHOLDER}';`,
    ``,
    `const response = await fetch('${url}', {`,
    ...init,
    `});`,
    ``,
    `const data = await response.json();`,
    `console.log(data);`,
  ].join('\n');
}

function buildPython(entry: OperationEntry, baseUrl: string, body: string): string {
  const url = `${baseUrl}${entry.path}`;
  const lines: string[] = [];
  lines.push(`import os`);
  lines.push(`import requests`);
  lines.push(``);
  lines.push(`api_key = os.environ.get("API_KEY", "${API_KEY_PLACEHOLDER}")`);
  lines.push(``);
  lines.push(`response = requests.${entry.method}(`);
  lines.push(`    "${url}",`);
  lines.push(`    headers={"Authorization": f"Bearer {api_key}"},`);
  if (body) {
    lines.push(`    json=${body},`);
  }
  lines.push(`)`);
  lines.push(``);
  lines.push(`print(response.status_code)`);
  lines.push(`print(response.json())`);
  return lines.join('\n');
}

function collectOperations(doc: OpenAPIDocument | null): OperationEntry[] {
  if (!doc?.paths) return [];
  const entries: OperationEntry[] = [];
  for (const [path, item] of Object.entries(doc.paths)) {
    if (!item) continue;
    for (const method of HTTP_METHODS) {
      const operation = item[method];
      if (!operation) continue;
      const tag = operation.tags && operation.tags.length > 0 ? operation.tags[0] : 'default';
      entries.push({
        id: `${method}-${path}`,
        method,
        path,
        tag,
        summary: operation.summary || operation.operationId || `${method.toUpperCase()} ${path}`,
        operation,
        pathParameters: [...(item.parameters || []), ...(operation.parameters || [])],
      });
    }
  }
  return entries;
}

function rateLimitText(operation: OpenAPIOperation): string {
  const rl = operation['x-rate-limit'];
  if (!rl) return 'Standard rate limits apply.';
  if (typeof rl === 'string') return rl;
  const parts: string[] = [];
  if (rl.limit !== undefined) parts.push(`${rl.limit} requests`);
  if (rl.window) parts.push(`per ${rl.window}`);
  return parts.length > 0 ? parts.join(' ') : 'Standard rate limits apply.';
}

function authText(operation: OpenAPIOperation, doc: OpenAPIDocument | null): string {
  const security = operation.security ?? [];
  if (security.length === 0) {
    return 'No authentication required.';
  }
  const schemes = doc?.components?.securitySchemes || {};
  const names = new Set<string>();
  for (const requirement of security) {
    for (const name of Object.keys(requirement)) {
      const scheme = schemes[name];
      if (scheme?.type === 'http' && scheme.scheme === 'bearer') {
        names.add('Bearer API key');
      } else if (scheme?.type === 'apiKey') {
        names.add(`API key (${scheme.in || 'header'}: ${scheme.name || 'X-API-Key'})`);
      } else if (scheme?.type === 'http') {
        names.add(`HTTP ${scheme.scheme || 'auth'}`);
      } else {
        names.add(name);
      }
    }
  }
  return names.size > 0 ? Array.from(names).join(', ') : 'Authentication required.';
}

/* ------------------------------------------------------------------ */
/* Schema renderer                                                     */
/* ------------------------------------------------------------------ */

interface SchemaViewProps {
  doc: OpenAPIDocument | null;
  schema?: OpenAPISchema;
  depth?: number;
}

const SchemaView: React.FC<SchemaViewProps> = ({ doc, schema, depth = 0 }) => {
  const resolved = resolveRef(doc, schema);
  if (!resolved) return <span className="api-docs__schema-empty">—</span>;

  if (resolved.oneOf || resolved.anyOf) {
    const variants = resolved.oneOf || resolved.anyOf || [];
    return (
      <div className="api-docs__schema">
        <span className="api-docs__schema-type">{resolved.oneOf ? 'oneOf' : 'anyOf'}</span>
        {variants.map((variant, idx) => (
          <div key={idx} className="api-docs__schema-variant">
            <SchemaView doc={doc} schema={variant} depth={depth + 1} />
          </div>
        ))}
      </div>
    );
  }

  if (resolved.allOf) {
    return (
      <div className="api-docs__schema">
        {resolved.allOf.map((part, idx) => (
          <SchemaView key={idx} doc={doc} schema={part} depth={depth + 1} />
        ))}
      </div>
    );
  }

  if (resolved.type === 'object' || resolved.properties) {
    const required = new Set(resolved.required || []);
    return (
      <div className="api-docs__schema api-docs__schema--object">
        {resolved.properties ? (
          Object.entries(resolved.properties).map(([name, prop]) => {
            const propResolved = resolveRef(doc, prop);
            return (
              <div key={name} className="api-docs__schema-prop">
                <div className="api-docs__schema-prop-head">
                  <code className="api-docs__schema-prop-name">{name}</code>
                  {required.has(name) && (
                    <span className="api-docs__required" title="Required field">
                      required
                    </span>
                  )}
                  {propResolved?.type && (
                    <span className="api-docs__schema-type">{propResolved.type}</span>
                  )}
                </div>
                {propResolved?.description && (
                  <p className="api-docs__schema-desc">{propResolved.description}</p>
                )}
                {propResolved?.enum && (
                  <p className="api-docs__schema-enum">
                    Enum: {propResolved.enum.map((v) => String(v)).join(', ')}
                  </p>
                )}
                {propResolved?.type === 'object' || propResolved?.type === 'array' ? (
                  <div className="api-docs__schema-nested">
                    <SchemaView doc={doc} schema={propResolved} depth={depth + 1} />
                  </div>
                ) : null}
              </div>
            );
          })
        ) : (
          <span className="api-docs__schema-empty">object</span>
        )}
      </div>
    );
  }

  if (resolved.type === 'array') {
    return (
      <div className="api-docs__schema api-docs__schema--array">
        <span className="api-docs__schema-type">array of</span>
        <SchemaView doc={doc} schema={resolved.items} depth={depth + 1} />
      </div>
    );
  }

  return (
    <span className="api-docs__schema-type">
      {resolved.type || 'any'}
      {resolved.format ? ` (${resolved.format})` : ''}
    </span>
  );
};

/* ------------------------------------------------------------------ */
/* Try it panel                                                        */
/* ------------------------------------------------------------------ */

interface TryItPanelProps {
  entry: OperationEntry;
  doc: OpenAPIDocument | null;
  baseUrl: string;
}

const TryItPanel: React.FC<TryItPanelProps> = ({ entry, doc, baseUrl }) => {
  const [apiKey, setApiKey] = useState<string>('');
  const [pathValues, setPathValues] = useState<Record<string, string>>({});
  const [queryValues, setQueryValues] = useState<Record<string, string>>({});
  const [body, setBody] = useState<string>('');
  const [result, setResult] = useState<TryItResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const requestMedia = pickJsonMedia(entry.operation.requestBody?.content);
  const requestExample = mediaTypeExample(doc, requestMedia);

  useEffect(() => {
    setResult(null);
    setError(null);
    setPathValues({});
    setQueryValues({});
    setBody(requestExample !== undefined ? JSON.stringify(requestExample, null, 2) : '');
  }, [entry.id, requestExample]);

  const pathParams = entry.pathParameters.filter((p) => p.in === 'path');
  const queryParams = entry.pathParameters.filter((p) => p.in === 'query');

  const buildUrl = useCallback(() => {
    let url = `${baseUrl}${entry.path}`;
    for (const param of pathParams) {
      const value = pathValues[param.name] ?? '';
      url = url.replace(`{${param.name}}`, encodeURIComponent(value));
    }
    const search = new URLSearchParams();
    for (const param of queryParams) {
      const value = queryValues[param.name];
      if (value !== undefined && value !== '') search.append(param.name, value);
    }
    const qs = search.toString();
    return qs ? `${url}?${qs}` : url;
  }, [baseUrl, entry.path, pathParams, queryParams, pathValues, queryValues]);

  const handleSend = useCallback(async () => {
    setLoading(true);
    setError(null);
    setResult(null);
    const started = performance.now();
    try {
      const headers: Record<string, string> = {};
      if (apiKey) headers.Authorization = `Bearer ${apiKey}`;
      const init: RequestInit = { method: entry.method.toUpperCase(), headers };
      if (body && entry.method !== 'get' && entry.method !== 'head') {
        headers['Content-Type'] = 'application/json';
        init.body = body;
      }
      const response = await fetch(buildUrl(), init);
      const text = await response.text();
      const responseHeaders: Array<[string, string]> = [];
      response.headers.forEach((value, key) => responseHeaders.push([key, value]));
      setResult({
        status: response.status,
        statusText: response.statusText,
        headers: responseHeaders,
        body: text,
        durationMs: Math.round(performance.now() - started),
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Request failed');
    } finally {
      setLoading(false);
    }
  }, [apiKey, body, buildUrl, entry.method]);

  return (
    <div className="api-docs__tryit">
      <h4 className="api-docs__tryit-title">Try it</h4>

      <label className="api-docs__field">
        <span>API key</span>
        <input
          type="password"
          value={apiKey}
          placeholder={API_KEY_PLACEHOLDER}
          onChange={(e) => setApiKey(e.target.value)}
          autoComplete="off"
        />
      </label>

      {pathParams.map((param) => (
        <label key={`path-${param.name}`} className="api-docs__field">
          <span>
            {param.name} <em>(path)</em>
          </span>
          <input
            value={pathValues[param.name] ?? ''}
            onChange={(e) => setPathValues((prev) => ({ ...prev, [param.name]: e.target.value }))}
          />
        </label>
      ))}

      {queryParams.map((param) => (
        <label key={`query-${param.name}`} className="api-docs__field">
          <span>
            {param.name} <em>(query)</em>
          </span>
          <input
            value={queryValues[param.name] ?? ''}
            onChange={(e) => setQueryValues((prev) => ({ ...prev, [param.name]: e.target.value }))}
          />
        </label>
      ))}

      {entry.operation.requestBody && (
        <label className="api-docs__field">
          <span>Request body (JSON)</span>
          <textarea
            rows={8}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            spellCheck={false}
          />
        </label>
      )}

      <button
        type="button"
        className="api-docs__send"
        onClick={handleSend}
        disabled={loading}
      >
        {loading ? 'Sending…' : 'Send request'}
      </button>

      {error && (
        <div className="api-docs__tryit-error" role="alert">
          {error}
        </div>
      )}

      {result && (
        <div className="api-docs__tryit-result">
          <div className="api-docs__tryit-status">
            <strong>{result.status}</strong> {result.statusText}{' '}
            <span className="api-docs__tryit-duration">{result.durationMs} ms</span>
          </div>
          <details open>
            <summary>Headers</summary>
            <pre className="api-docs__pre">
              {result.headers.map(([k, v]) => `${k}: ${v}`).join('\n')}
            </pre>
          </details>
          <details open>
            <summary>Body</summary>
            <pre className="api-docs__pre">{result.body}</pre>
          </details>
        </div>
      )}
    </div>
  );
};

/* ------------------------------------------------------------------ */
/* Code snippets                                                       */
/* ------------------------------------------------------------------ */

interface SnippetsProps {
  entry: OperationEntry;
  baseUrl: string;
  doc: OpenAPIDocument | null;
}

const Snippets: React.FC<SnippetsProps> = ({ entry, baseUrl, doc }) => {
  const [copied, setCopied] = useState<string | null>(null);
  const requestMedia = pickJsonMedia(entry.operation.requestBody?.content);
  const example = mediaTypeExample(doc, requestMedia);
  const body = example !== undefined ? JSON.stringify(example, null, 2) : '';

  const snippets = useMemo(
    () => [
      { id: 'curl', label: 'cURL', code: buildCurl(entry, baseUrl, body, '') },
      { id: 'ts', label: 'TypeScript', code: buildTypeScript(entry, baseUrl, body) },
      { id: 'py', label: 'Python', code: buildPython(entry, baseUrl, body) },
    ],
    [entry, baseUrl, body],
  );

  const handleCopy = useCallback(async (id: string, code: string) => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(code);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = code;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      setCopied(id);
      window.setTimeout(() => setCopied(null), 1500);
    } catch {
      setCopied(null);
    }
  }, []);

  return (
    <div className="api-docs__snippets">
      {snippets.map((snippet) => (
        <div key={snippet.id} className="api-docs__snippet">
          <div className="api-docs__snippet-head">
            <span>{snippet.label}</span>
            <button
              type="button"
              className="api-docs__copy"
              onClick={() => handleCopy(snippet.id, snippet.code)}
            >
              {copied === snippet.id ? 'Copied!' : snippet.id === 'curl' ? 'Copy as cURL' : 'Copy'}
            </button>
          </div>
          <pre className="api-docs__pre">{snippet.code}</pre>
        </div>
      ))}
    </div>
  );
};

/* ------------------------------------------------------------------ */
/* Operation card                                                      */
/* ------------------------------------------------------------------ */

interface OperationCardProps {
  entry: OperationEntry;
  doc: OpenAPIDocument | null;
  baseUrl: string;
}

const OperationCard: React.FC<OperationCardProps> = ({ entry, doc, baseUrl }) => {
  const anchor = operationAnchor(entry);
  const requestMedia = pickJsonMedia(entry.operation.requestBody?.content);
  const requestExample = mediaTypeExample(doc, requestMedia);
  const responses = entry.operation.responses || {};

  return (
    <section id={anchor} className="api-docs__operation" data-testid={`operation-${anchor}`}>
      <header className="api-docs__operation-head">
        <span
          className="api-docs__method"
          style={{ backgroundColor: METHOD_COLORS[entry.method] }}
        >
          {entry.method.toUpperCase()}
        </span>
        <code className="api-docs__path">{entry.path}</code>
        <a className="api-docs__anchor" href={`#${anchor}`} aria-label="Deep link">
          #
        </a>
      </header>
      <h3 className="api-docs__operation-title">{entry.summary}</h3>
      {entry.operation.description && (
        <p className="api-docs__operation-desc">{entry.operation.description}</p>
      )}

      <div className="api-docs__meta">
        <div className="api-docs__meta-item">
          <strong>Authentication:</strong> {authText(entry.operation, doc)}
        </div>
        <div className="api-docs__meta-item">
          <strong>Rate limit:</strong> {rateLimitText(entry.operation)}
        </div>
      </div>

      {entry.pathParameters.length > 0 && (
        <div className="api-docs__section">
          <h4>Parameters</h4>
          <table className="api-docs__table">
            <thead>
              <tr>
                <th>Name</th>
                <th>In</th>
                <th>Type</th>
                <th>Required</th>
                <th>Description</th>
              </tr>
            </thead>
            <tbody>
              {entry.pathParameters.map((param) => (
                <tr key={`${param.in}-${param.name}`}>
                  <td>
                    <code>{param.name}</code>
                  </td>
                  <td>{param.in}</td>
                  <td>{param.schema?.type || 'any'}</td>
                  <td>{param.required ? 'Yes' : 'No'}</td>
                  <td>{param.description || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {entry.operation.requestBody && (
        <div className="api-docs__section">
          <h4>
            Request body
            {entry.operation.requestBody.required && (
              <span className="api-docs__required">required</span>
            )}
          </h4>
          {entry.operation.requestBody.description && (
            <p className="api-docs__schema-desc">{entry.operation.requestBody.description}</p>
          )}
          <SchemaView doc={doc} schema={requestMedia?.schema} />
          {requestExample !== undefined && (
            <details className="api-docs__example">
              <summary>Example</summary>
              <pre className="api-docs__pre">{JSON.stringify(requestExample, null, 2)}</pre>
            </details>
          )}
        </div>
      )}

      <div className="api-docs__section">
        <h4>Responses</h4>
        {Object.entries(responses).map(([status, response]) => {
          const media = pickJsonMedia(response.content);
          const example = mediaTypeExample(doc, media);
          return (
            <div key={status} className="api-docs__response">
              <div className="api-docs__response-head">
                <code className="api-docs__status">{status}</code>
                <span>{response.description || ''}</span>
              </div>
              {media?.schema && <SchemaView doc={doc} schema={media.schema} />}
              {example !== undefined && (
                <details className="api-docs__example">
                  <summary>Example</summary>
                  <pre className="api-docs__pre">{JSON.stringify(example, null, 2)}</pre>
                </details>
              )}
            </div>
          );
        })}
      </div>

      <Snippets entry={entry} baseUrl={baseUrl} doc={doc} />
      <TryItPanel entry={entry} doc={doc} baseUrl={baseUrl} />
    </section>
  );
};

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

const ApiDocsPage: React.FC = () => {
  const [doc, setDoc] = useState<OpenAPIDocument | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);
  const abortRef = useRef<AbortController | null>(null);

  const load = useCallback(() => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setLoading(true);
    setError(null);
    fetch('/v1/openapi.json', { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(`Failed to load specification (HTTP ${response.status})`);
        }
        return (await response.json()) as OpenAPIDocument;
      })
      .then((data) => {
        setDoc(data);
        setLoading(false);
      })
      .catch((err: unknown) => {
        if (err instanceof DOMException && err.name === 'AbortError') return;
        setError(err instanceof Error ? err.message : 'Failed to load specification');
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    load();
    return () => abortRef.current?.abort();
  }, [load, reloadToken]);

  const operations = useMemo(() => collectOperations(doc), [doc]);

  const baseUrl = useMemo(() => {
    const server = doc?.servers?.[0]?.url;
    if (server) return server.replace(/\/$/, '');
    return '';
  }, [doc]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return operations;
    return operations.filter(
      (op) =>
        op.path.toLowerCase().includes(term) ||
        op.summary.toLowerCase().includes(term) ||
        op.method.toLowerCase().includes(term),
    );
  }, [operations, search]);

  const grouped = useMemo(() => {
    const map = new Map<string, OperationEntry[]>();
    for (const op of filtered) {
      const list = map.get(op.tag) || [];
      list.push(op);
      map.set(op.tag, list);
    }
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [filtered]);

  const tagDescriptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const tag of doc?.tags || []) {
      if (tag.description) map.set(tag.name, tag.description);
    }
    return map;
  }, [doc]);

  const handleRetry = useCallback(() => {
    setReloadToken((t) => t + 1);
  }, []);

  if (loading) {
    return (
      <div className="api-docs" data-testid="api-docs-page">
        <div className="api-docs__loading">Loading API documentation…</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="api-docs" data-testid="api-docs-page">
        <div className="api-docs__error" role="alert">
          <h2>Unable to load API documentation</h2>
          <p>{error}</p>
          <button type="button" className="api-docs__retry" onClick={handleRetry}>
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="api-docs" data-testid="api-docs-page">
      <aside className="api-docs__sidebar">
        <div className="api-docs__sidebar-head">
          <h1 className="api-docs__title">{doc?.info?.title || 'API Documentation'}</h1>
          {doc?.info?.version && (
            <span className="api-docs__version">v{doc.info.version}</span>
          )}
        </div>
        <input
          type="search"
          className="api-docs__search"
          placeholder="Search operations…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          aria-label="Search operations"
        />
        <nav className="api-docs__nav">
          {grouped.length === 0 && (
            <p className="api-docs__nav-empty">No operations match your search.</p>
          )}
          {grouped.map(([tag, ops]) => (
            <div key={tag} className="api-docs__nav-group">
              <button
                type="button"
                className={`api-docs__nav-tag${activeTag === tag ? ' is-active' : ''}`}
                onClick={() => setActiveTag(activeTag === tag ? null : tag)}
              >
                {tag}
                <span className="api-docs__nav-count">{ops.length}</span>
              </button>
              {(activeTag === null || activeTag === tag) && (
                <ul className="api-docs__nav-list">
                  {ops.map((op) => (
                    <li key={op.id}>
                      <a href={`#${operationAnchor(op)}`} className="api-docs__nav-link">
                        <span
                          className="api-docs__nav-method"
                          style={{ color: METHOD_COLORS[op.method] }}
                        >
                          {op.method.toUpperCase()}
                        </span>
                        <span className="api-docs__nav-summary">{op.summary}</span>
                      </a>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </nav>
      </aside>

      <main className="api-docs__main">
        {doc?.info?.description && (
          <p className="api-docs__intro">{doc.info.description}</p>
        )}
        {grouped.map(([tag, ops]) => (
          <div key={tag} className="api-docs__tag-section">
            <h2 className="api-docs__tag-title" id={`tag-${slugify(tag)}`}>
              {tag}
            </h2>
            {tagDescriptions.get(tag) && (
              <p className="api-docs__tag-desc">{tagDescriptions.get(tag)}</p>
            )}
            {ops.map((op) => (
              <OperationCard key={op.id} entry={op} doc={doc} baseUrl={baseUrl} />
            ))}
          </div>
        ))}
      </main>
    </div>
  );
};

export default ApiDocsPage;