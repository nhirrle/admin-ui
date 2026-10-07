export type Shell = 'bash' | 'powershell';

export const defaultShell: Shell = /win/i.test(navigator.userAgent) ? 'powershell' : 'bash';

export const shellQuote = (value: string) => `'${value.replace(/'/g, `'\\''`)}'`;

export const psQuote = (value: string) => `'${value.replace(/'/g, "''")}'`;
