// Learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom'

// Polyfill fetch for Node.js environment
import 'whatwg-fetch'

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter() {
    return {
      push: jest.fn(),
      replace: jest.fn(),
      prefetch: jest.fn(),
      back: jest.fn(),
      pathname: '/',
      query: {},
      asPath: '/',
    }
  },
  usePathname() {
    return '/'
  },
  useSearchParams() {
    return new URLSearchParams()
  },
}))

// Mock Next.js headers
jest.mock('next/headers', () => ({
  headers: jest.fn(() => ({
    get: jest.fn(),
    set: jest.fn(),
  })),
  cookies: jest.fn(() => ({
    get: jest.fn(),
    set: jest.fn(),
    getAll: jest.fn(() => []),
  })),
}))

// Mock Web APIs (Request, Response, URL) for Next.js API routes
global.Request = class Request {
  constructor(input, init = {}) {
    this.url = typeof input === 'string' ? input : input.url;
    this.method = init.method || 'GET';
    this.headers = new Headers(init.headers || {});
    this.body = init.body || null;
  }
  
  async json() {
    return this.body ? JSON.parse(this.body) : {};
  }
  
  async text() {
    return this.body || '';
  }
}

global.Response = class Response {
  constructor(body, init = {}) {
    this.body = body;
    this.status = init.status || 200;
    this.statusText = init.statusText || 'OK';
    this.headers = new Headers(init.headers || {});
  }
  
  json() {
    return Promise.resolve(typeof this.body === 'string' ? JSON.parse(this.body) : this.body);
  }
  
  text() {
    return Promise.resolve(typeof this.body === 'string' ? this.body : JSON.stringify(this.body));
  }
  
  static json(data, init = {}) {
    return new Response(JSON.stringify(data), { ...init, headers: { 'Content-Type': 'application/json', ...init.headers } });
  }
}

// Mock fetch for Node.js environment
if (typeof fetch === 'undefined') {
  global.fetch = async (url, options = {}) => {
    // Simple mock fetch - returns a mock response
    return {
      ok: true,
      status: 200,
      statusText: 'OK',
      json: async () => ({}),
      text: async () => '',
      headers: new Headers(),
    };
  };
}

// Mock URL for Next.js
if (typeof URL === 'undefined') {
  global.URL = class URL {
    constructor(input, base) {
      this.href = typeof input === 'string' ? input : input.href;
      this.searchParams = new URLSearchParams(this.href.split('?')[1] || '');
    }
  }
}

// Mock environment variables
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co'
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key'
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key'
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test'
process.env.KV_REST_API_URL = 'https://test.kv.vercel.app'
process.env.KV_REST_API_TOKEN = 'test-kv-token'

// Suppress console errors/warnings in tests (expected network failures, etc.)
const originalError = console.error
const originalWarn = console.warn

console.error = (...args) => {
  // Suppress expected errors in test environment
  const message = args[0]?.toString() || ''
  if (
    message.includes('KV cache error') ||
    message.includes('Tenant not found') ||
    message.includes('Network request failed') ||
    message.includes('getaddrinfo ENOTFOUND') ||
    message.includes('preflight has invalid HTTP status code')
  ) {
    return // Suppress expected test errors
  }
  originalError(...args)
}

console.warn = (...args) => {
  // Suppress expected warnings in test environment
  const message = args[0]?.toString() || ''
  if (
    message.includes('Database not available') ||
    message.includes('skipping')
  ) {
    return // Suppress expected test warnings
  }
  originalWarn(...args)
}

