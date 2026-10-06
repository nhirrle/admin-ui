import { apiCall } from './api';
import { ADMIN_API_BASE, RequestDetails } from '../types';

const get = (url: string, headers: Record<string, string> = {}): RequestDetails => ({
  url,
  method: 'GET',
  headers,
  queryParams: {},
  body: null,
});

export const fetchSiteNames = async (owner: string): Promise<string[]> => {
  const { responseData } = await apiCall(get(`${ADMIN_API_BASE}/config/${owner}/sites.json`));
  return (responseData?.sites ?? [])
    .map((s: { name: string }) => s.name)
    .sort((a: string, b: string) => a.localeCompare(b));
};

export const fetchSiteConfig = async (owner: string, site: string): Promise<any> => {
  const { responseData } = await apiCall(get(`${ADMIN_API_BASE}/config/${owner}/sites/${site}.json`));
  return responseData;
};

export const fetchRobotsTxt = async (owner: string, site: string): Promise<string> => {
  const { responseData } = await apiCall(
    get(`${ADMIN_API_BASE}/config/${owner}/sites/${site}/robots.txt`, { accept: 'text/plain' }),
  );
  return typeof responseData === 'string' ? responseData : '';
};

export async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;
  const worker = async () => {
    while (next < items.length) {
      const i = next++;
      results[i] = await fn(items[i]);
    }
  };
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

// Never show credential material in overview/compare, only how many entries exist.
const SENSITIVE_ROOTS = ['secrets', 'tokens', 'apiKeys'];
// CDN configs can carry credentials (e.g. authToken, clientSecret).
const SENSITIVE_LEAF = /token|secret|password/i;

export const VOLATILE_KEYS = ['name', 'created', 'lastModified'];

export const flattenConfig = (
  value: any,
  prefix = '',
  out: Record<string, string> = {},
): Record<string, string> => {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    if (!prefix) return out;
    const leaf = prefix.split('.').pop() ?? '';
    out[prefix] = SENSITIVE_LEAF.test(leaf)
      ? '(hidden)'
      : typeof value === 'string' ? value : JSON.stringify(value);
    return out;
  }
  const keys = Object.keys(value);
  if (prefix && keys.length === 0) {
    out[prefix] = '{}';
    return out;
  }
  keys.forEach((key) => {
    const path = prefix ? `${prefix}.${key}` : key;
    if (!prefix && SENSITIVE_ROOTS.includes(key) && value[key] && typeof value[key] === 'object') {
      out[path] = `(${Object.keys(value[key]).length} entries)`;
    } else {
      flattenConfig(value[key], path, out);
    }
  });
  return out;
};

const TECH_ACCOUNT_PATTERN = /@techacct\.adobe\.com$/i;

export const findTechAccounts = (config: any): string[] => {
  const found = new Set<string>();
  const walk = (value: any) => {
    if (typeof value === 'string') {
      if (TECH_ACCOUNT_PATTERN.test(value)) found.add(value);
    } else if (value && typeof value === 'object') {
      Object.values(value).forEach(walk);
    }
  };
  walk(config?.access);
  return Array.from(found);
};

// An empty replacement removes the account from role lists.
const replaceAccounts = (value: any, map: Record<string, string>): any => {
  if (Array.isArray(value)) {
    return value
      .filter((v) => !(typeof v === 'string' && v in map && !map[v].trim()))
      .map((v) => replaceAccounts(v, map));
  }
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, replaceAccounts(v, map)]));
  }
  return typeof value === 'string' && value in map ? map[value].trim() : value;
};

export interface CloneOptions {
  includeCdn: boolean;
  includeAccess: boolean;
  techAccounts?: Record<string, string>;
  contentUrl?: string;
  cdnHost?: string;
}

// Fields that are server-managed or bound to the source site and must not be copied.
const NON_CLONEABLE_KEYS = ['name', 'created', 'lastModified', 'apiKeys', 'tokens', 'secrets'];

export const prepareClone = (source: any, options: CloneOptions): any => {
  const { includeCdn, includeAccess, techAccounts, contentUrl, cdnHost } = options;
  const clone = JSON.parse(JSON.stringify(source ?? {}));
  NON_CLONEABLE_KEYS.forEach((key) => delete clone[key]);
  if (clone.content) delete clone.content.contentBusId;
  if (contentUrl && clone.content?.source) clone.content.source.url = contentUrl.trim();
  if (!includeCdn) delete clone.cdn;
  else if (cdnHost && clone.cdn?.prod) clone.cdn.prod.host = cdnHost.trim();
  if (!includeAccess) delete clone.access;
  else if (clone.access && techAccounts) clone.access = replaceAccounts(clone.access, techAccounts);
  return clone;
};

export const detectSitemapHost = (robots: string): string =>
  /^\s*sitemap:\s*https?:\/\/([^/\s]+)/im.exec(robots)?.[1] ?? '';

export const replaceSitemapHost = (robots: string, host: string): string =>
  (host.trim() ? robots.replace(/^(\s*sitemap:\s*https?:\/\/)[^/\s]+/gim, `$1${host.trim()}`) : robots);
