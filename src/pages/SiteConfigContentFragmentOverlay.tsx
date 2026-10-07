import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Chip,
  CircularProgress,
  Divider,
  FormControlLabel,
  IconButton,
  Paper,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import LayersIcon from '@mui/icons-material/Layers';
import SiteInputs from '../components/SiteInputs';
import PageHeader from '../components/PageHeader';
import ErrorDisplay from '../components/ErrorDisplay';
import OverlayTester from '../components/OverlayTester';
import { defaultShell, psQuote, Shell, shellQuote } from '../utils/shell';
import { useResource } from '../context/ResourceContext';
import { useSnackbar } from '../context/SnackbarContext';
import { apiCall } from '../utils/api';
import { ErrorDetails, parseApiError } from '../utils/errorUtils';
import { ADMIN_API_BASE } from '../types';
import { useNavigate } from 'react-router-dom';

const JSON2HTML_BASE = 'https://json2html.adobeaem.workers.dev';
interface MappingRow { source: string; target: string }
interface Json2HtmlEntry {
  path: string;
  endpoint: string;
  regex: string;
  template: string;
  relativeURLPrefix: string;
  headers: string;
  forwardHeaders: string;
  arrayKey: string;
  pathKey: string;
  templateApiKey: string;
  useAEMMapping: boolean;
}

const newEntry = (): Json2HtmlEntry => ({
  path: '',
  endpoint: '',
  regex: '',
  template: '',
  relativeURLPrefix: '',
  headers: 'Accept: application/json',
  forwardHeaders: 'Authorization',
  arrayKey: '',
  pathKey: '',
  templateApiKey: '',
  useAEMMapping: false,
});

const toLines = (value: string) => value.split('\n').map((l) => l.trim()).filter(Boolean);
const toCsv = (value: string) => value.split(',').map((l) => l.trim()).filter(Boolean);

const parseMapping = (mapping: string): MappingRow => {
  const idx = mapping.indexOf(':');
  return idx === -1
    ? { source: mapping, target: '' }
    : { source: mapping.slice(0, idx), target: mapping.slice(idx + 1) };
};

const entryToPayload = (entry: Json2HtmlEntry) => {
  const payload: Record<string, any> = { path: entry.path.trim(), endpoint: entry.endpoint.trim() };
  (['regex', 'template', 'relativeURLPrefix', 'arrayKey', 'pathKey', 'templateApiKey'] as const)
    .forEach((key) => {
      if (entry[key].trim()) payload[key] = entry[key].trim();
    });
  const headers = toLines(entry.headers).reduce<Record<string, string>>((acc, line) => {
    const idx = line.indexOf(':');
    if (idx > 0) acc[line.slice(0, idx).trim()] = line.slice(idx + 1).trim();
    return acc;
  }, {});
  if (Object.keys(headers).length) payload.headers = headers;
  const forward = toCsv(entry.forwardHeaders);
  if (forward.length) payload.forwardHeaders = forward;
  if (entry.useAEMMapping) payload.useAEMMapping = true;
  return payload;
};

const payloadToEntry = (item: any): Json2HtmlEntry => ({
  ...newEntry(),
  ...(['path', 'endpoint', 'regex', 'template', 'relativeURLPrefix', 'arrayKey', 'pathKey', 'templateApiKey'] as const)
    .reduce<Partial<Json2HtmlEntry>>((acc, key) => ({ ...acc, [key]: typeof item?.[key] === 'string' ? item[key] : '' }), {}),
  headers: Object.entries(item?.headers || {}).map(([k, v]) => `${k}: ${v}`).join('\n'),
  forwardHeaders: (item?.forwardHeaders || []).join(', '),
  useAEMMapping: Boolean(item?.useAEMMapping),
});

// Accepts the raw array or a response object wrapping it
const extractEntries = (parsed: any): any[] | null => {
  if (Array.isArray(parsed)) return parsed;
  if (parsed && typeof parsed === 'object') {
    const arr = Object.values(parsed).find(Array.isArray);
    return (arr as any[]) || null;
  }
  return null;
};

const storageKey = (owner: string, site: string, branch: string) => `json2html_config:${owner}/${site}/${branch}`;


const StepHeader: React.FC<{ step: number; title: string; done?: boolean; doneLabel?: string }> = ({
  step, title, done, doneLabel = 'Configured',
}) => (
  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
    <Chip label={step} color="primary" size="small" />
    <Typography variant="h6" sx={{ flex: 1 }}>{title}</Typography>
    {done !== undefined && (
      <Chip
        label={done ? doneLabel : 'Not configured'}
        color={done ? 'success' : 'default'}
        size="small"
        variant={done ? 'filled' : 'outlined'}
      />
    )}
  </Box>
);

const SiteConfigContentFragmentOverlay: React.FC = () => {
  const { owner, site, ref, setRef } = useResource();
  const navigate = useNavigate();
  const branch = ref || 'main';
  const { showSuccess, showError } = useSnackbar();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<ErrorDetails | null>(null);

  const [content, setContent] = useState<any>(null);

  const [mappings, setMappings] = useState<MappingRow[]>([]);
  const [fragmentRules, setFragmentRules] = useState<{ glob: string; models: string[] }[]>([]);

  const [entries, setEntries] = useState<Json2HtmlEntry[]>([newEntry()]);
  const [entriesKey, setEntriesKey] = useState('');
  const [restored, setRestored] = useState(false);
  const [importText, setImportText] = useState('');
  const [importOpen, setImportOpen] = useState(false);
  const [shell, setShell] = useState<Shell>(defaultShell);

  const currentKey = owner && site ? storageKey(owner, site, branch) : '';

  useEffect(() => {
    const stored = currentKey ? localStorage.getItem(currentKey) : null;
    let list: any[] | null = null;
    try {
      list = stored ? extractEntries(JSON.parse(stored)) : null;
    } catch {
      list = null;
    }
    setEntries(list?.length ? list.map(payloadToEntry) : [newEntry()]);
    setRestored(Boolean(list?.length));
    setEntriesKey(currentKey);
  }, [currentKey]);

  const json2htmlOverlayUrl = `${JSON2HTML_BASE}/${owner || '{org}'}/${site || '{site}'}/${branch}`;
  const json2htmlConfigUrl = `${JSON2HTML_BASE}/config/${owner || '{org}'}/${site || '{site}'}/${branch}`;

  const load = useCallback(async () => {
    if (!owner || !site) return;
    setLoading(true);
    setError(null);
    try {
      const { responseData: siteConfig } = await apiCall({
        url: `${ADMIN_API_BASE}/config/${owner}/sites/${site}.json`,
        method: 'GET', headers: {}, queryParams: {}, body: null,
      });
      const c = siteConfig?.content || {};
      setContent(c);

      let pub: any = {};
      try {
        const { responseData } = await apiCall({
          url: `${ADMIN_API_BASE}/config/${owner}/sites/${site}/public.json`,
          method: 'GET', headers: {}, queryParams: {}, body: null,
        });
        pub = responseData || {};
      } catch (e) {
        // public.json does not exist until first saved
        if (parseApiError(e).status !== 404) throw e;
      }
      setMappings((pub.paths?.mappings || []).map(parseMapping));
      const overlayRules = pub.xwalk?.['content-fragment-overlay'] || {};
      setFragmentRules(Object.entries(overlayRules).map(([glob, rule]: [string, any]) => ({
        glob,
        models: rule?.includes || [],
      })));
    } catch (e) {
      setError(parseApiError(e));
    } finally {
      setLoading(false);
    }
  }, [owner, site]);

  useEffect(() => {
    setContent(null);
    load();
  }, [load]);

  const json2htmlPayload = useMemo(
    () => entries.filter((e) => e.path.trim() && e.endpoint.trim()).map(entryToPayload),
    [entries],
  );
  const payloadJson = JSON.stringify(json2htmlPayload, null, 2);

  useEffect(() => {
    if (!currentKey || entriesKey !== currentKey) return;
    // Secrets stay out of localStorage
    const toStore = json2htmlPayload.map(({ templateApiKey, ...rest }) => rest);
    if (toStore.length) localStorage.setItem(currentKey, JSON.stringify(toStore));
    else localStorage.removeItem(currentKey);
  }, [json2htmlPayload, currentKey, entriesKey]);

  const buildGet = (token: string) => (shell === 'powershell'
    ? `Invoke-RestMethod -Uri ${psQuote(json2htmlConfigUrl)} -Headers @{ Authorization = ${psQuote(`token ${token}`)} } | ConvertTo-Json -Depth 10 | Set-Clipboard`
    : `curl -s ${shellQuote(json2htmlConfigUrl)} -H ${shellQuote(`Authorization: token ${token}`)}`);

  const importConfig = () => {
    try {
      const list = extractEntries(JSON.parse(importText));
      if (!list?.length) {
        showError('No configuration entries found in the pasted JSON');
        return;
      }
      setEntries(list.map(payloadToEntry));
      setRestored(false);
      setImportText('');
      setImportOpen(false);
      showSuccess(`Imported ${list.length} path${list.length > 1 ? 's' : ''}`);
    } catch {
      showError('Pasted text is not valid JSON');
    }
  };
  const buildCurl = (token: string) => (shell === 'powershell'
    ? [
      `Invoke-RestMethod -Method Post -Uri ${psQuote(json2htmlConfigUrl)} \``,
      `  -Headers @{ Authorization = ${psQuote(`token ${token}`)} } \``,
      `  -ContentType 'application/json' \``,
      `  -Body ${psQuote(JSON.stringify(json2htmlPayload))}`,
    ]
    : [
      `curl -X POST ${shellQuote(json2htmlConfigUrl)} \\`,
      `  -H ${shellQuote(`Authorization: token ${token}`)} \\`,
      `  -H 'Content-Type: application/json' \\`,
      `  --data ${shellQuote(JSON.stringify(json2htmlPayload))}`,
    ]).join('\n');

  const copy = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      showSuccess(`${label} copied to clipboard`);
    } catch {
      showError('Could not access clipboard');
    }
  };

  const updateEntry = (index: number, patch: Partial<Json2HtmlEntry>) =>
    setEntries((prev) => prev.map((e, i) => (i === index ? { ...e, ...patch } : e)));

  const overlayIsJson2Html = content?.overlay?.url?.startsWith(JSON2HTML_BASE);

  return (
    <Box>
      <PageHeader
        title="Content Fragment Overlay"
        description="Publish AEM Content Fragments as HTML pages: overlay the content source with json2html, map and allow-list fragment folders, and configure the json2html transformation."
        icon={LayersIcon}
        helpUrl="https://www.aem.live/developer/content-fragment-overlay"
      />

      <Paper sx={{ p: 3, mb: 3, border: 1, borderColor: 'grey.300' }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <SiteInputs />
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>
            <TextField
              label="Branch"
              value={ref}
              onChange={(e) => setRef(e.target.value)}
              placeholder="main"
              helperText="Used for the json2html URLs (defaults to main)"
              sx={{ flex: 1 }}
            />
            <Button
              variant="outlined"
              onClick={load}
              disabled={!owner || !site || loading}
              startIcon={loading ? <CircularProgress size={20} /> : null}
              sx={{ mt: 1 }}
            >
              Reload
            </Button>
          </Box>
        </Box>
      </Paper>

      <ErrorDisplay error={error} onDismiss={() => setError(null)} requestDetails={null} />

      {!owner || !site ? (
        <Alert severity="info">Enter an organization and site to load the current configuration.</Alert>
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column' }}>
          <Paper sx={{ p: 3, mb: 3, border: 1, borderColor: 'grey.300', order: 2 }}>
            <StepHeader
              step={2}
              title="Content source overlay"
              done={content ? Boolean(content.overlay?.url) : undefined}
              doneLabel={overlayIsJson2Html ? 'json2html overlay' : 'Custom overlay'}
            />
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Set the overlay URL and type in the full site configuration. The json2html URL for this branch is:
            </Typography>
            <Box component="code" sx={{ display: 'block', mb: 2 }}>{json2htmlOverlayUrl}</Box>
            {content?.overlay?.url && (
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Current: {content.overlay.url} ({content.overlay.type || 'markup'})
              </Typography>
            )}
            <Button variant="contained" onClick={() => navigate('/site-config/update')}>
              Configure in Update Site Config
            </Button>
          </Paper>

          <Paper sx={{ p: 3, mb: 3, border: 1, borderColor: 'grey.300', order: 3 }}>
            <StepHeader
              step={3}
              title="Path mappings"
              done={content ? mappings.length > 0 && fragmentRules.length > 0 : undefined}
            />
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Path mappings and fragment model allow-lists belong with the site's public path configuration.
            </Typography>
            {mappings.length > 0 && (
              <Typography variant="body2" sx={{ mb: 2 }}>
                {mappings.length} mapping{mappings.length === 1 ? '' : 's'} loaded
              </Typography>
            )}
            <Button variant="outlined" onClick={() => navigate('/site-config/update-path-mappings')}>
              Configure Path Mappings
            </Button>
          </Paper>

          <Paper sx={{ p: 3, mb: 3, border: 1, borderColor: 'grey.300', order: 1 }}>
            <StepHeader step={1} title="json2html transformation" />
            <Alert severity="info" sx={{ mb: 2 }}>
              The json2html service does not allow browser requests. Fill in the form, then copy the generated command
              and run it in a terminal. Each save replaces the whole configuration for this branch, so include every path.
            </Alert>
            {restored && (
              <Alert severity="success" sx={{ mb: 2 }}>
                Restored the last configuration prepared in this browser for {owner}/{site}/{branch}.
                Import to make sure it matches what is live.
              </Alert>
            )}
            <Box sx={{ mb: 2 }}>
              <Button variant="outlined" size="small" onClick={() => setImportOpen((o) => !o)}>
                {importOpen ? 'Hide import' : 'Import existing configuration'}
              </Button>
            </Box>
            {importOpen && (
              <Paper variant="outlined" sx={{ p: 2, mb: 2, bgcolor: 'grey.50' }}>
                <Typography variant="body2" sx={{ mb: 1 }}>
                  1. Run this command in a terminal to read the current configuration
                  {shell === 'powershell' ? ' (the result is copied to your clipboard):' : ':'}
                </Typography>
                <Box
                  component="pre"
                  sx={{ p: 2, bgcolor: 'grey.100', borderRadius: 1, overflow: 'auto', fontSize: '0.8rem', mt: 0 }}
                >
                  {buildGet('<your-admin-token>')}
                </Box>
                <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }}>
                  <Button size="small" startIcon={<ContentCopyIcon />}
                    onClick={() => copy(buildGet('<your-admin-token>'), 'Command')}>
                    Copy command
                  </Button>
                  <Tooltip title="Includes your admin token. Don't paste it anywhere it could be shared.">
                    <span>
                      <Button size="small" variant="contained" startIcon={<ContentCopyIcon />}
                        disabled={!localStorage.getItem('authToken')}
                        onClick={() => copy(buildGet(localStorage.getItem('authToken') || ''), 'Command with token')}>
                        Copy command with my token
                      </Button>
                    </span>
                  </Tooltip>
                </Box>
                <Typography variant="body2" sx={{ mb: 1 }}>2. Paste the JSON output here:</Typography>
                <TextField
                  value={importText}
                  onChange={(e) => setImportText(e.target.value)}
                  multiline
                  minRows={4}
                  maxRows={12}
                  fullWidth
                  placeholder='[{ "path": "/press/", "endpoint": "https://..." }]'
                  InputProps={{ sx: { fontFamily: 'monospace', fontSize: '0.8rem' } }}
                />
                <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 1 }}>
                  <Button variant="contained" size="small" onClick={importConfig} disabled={!importText.trim()}>
                    Import
                  </Button>
                </Box>
              </Paper>
            )}
            {entries.map((entry, i) => (
              <Paper key={i} variant="outlined" sx={{ p: 2, mb: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <Typography variant="subtitle2" sx={{ flex: 1 }}>Path {i + 1}</Typography>
                  {entries.length > 1 && (
                    <IconButton aria-label="Remove path" onClick={() => setEntries((p) => p.filter((_, j) => j !== i))}>
                      <DeleteIcon />
                    </IconButton>
                  )}
                </Box>
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 2fr' }, gap: 2 }}>
                  <TextField size="small" required label="Path" value={entry.path} placeholder="/press/"
                    helperText="Public path handled by this entry"
                    onChange={(e) => updateEntry(i, { path: e.target.value })} />
                  <TextField size="small" required label="Endpoint" value={entry.endpoint}
                    placeholder="https://author-pXXXX-eXXXX.adobeaemcloud.com/api/assets/my-site/press/{{id}}.json"
                    helperText="JSON source; {{id}} is replaced by the regex match"
                    onChange={(e) => updateEntry(i, { endpoint: e.target.value })} />
                  <TextField size="small" label="Regex" value={entry.regex} placeholder="/(?<=\/press\/)(.+)$/"
                    helperText="Extracts {{id}} from the URL"
                    onChange={(e) => updateEntry(i, { regex: e.target.value })} />
                  <TextField size="small" label="Template" value={entry.template} placeholder="/cf-templates/press.html"
                    helperText="Mustache template in the site's GitHub repo"
                    onChange={(e) => updateEntry(i, { template: e.target.value })} />
                  <TextField size="small" label="Relative URL prefix" value={entry.relativeURLPrefix}
                    placeholder="https://publish-pXXXX-eXXXX.adobeaemcloud.com"
                    helperText="Makes relative image/asset URLs absolute"
                    onChange={(e) => updateEntry(i, { relativeURLPrefix: e.target.value })} />
                  <TextField size="small" label="Forward headers" value={entry.forwardHeaders}
                    helperText="Comma-separated; Authorization is needed for AEM author"
                    onChange={(e) => updateEntry(i, { forwardHeaders: e.target.value })} />
                  <TextField size="small" label="Request headers" value={entry.headers} multiline minRows={1}
                    helperText="One per line: Name: value"
                    onChange={(e) => updateEntry(i, { headers: e.target.value })} />
                  <TextField size="small" label="Template API key" value={entry.templateApiKey} type="password"
                    helperText="Site token, only if the site is protected"
                    onChange={(e) => updateEntry(i, { templateApiKey: e.target.value })} />
                  <TextField size="small" label="Array key" value={entry.arrayKey}
                    helperText="Optional: pick an item from an array"
                    onChange={(e) => updateEntry(i, { arrayKey: e.target.value })} />
                  <TextField size="small" label="Path key" value={entry.pathKey}
                    helperText="Optional: item property matched against the path"
                    onChange={(e) => updateEntry(i, { pathKey: e.target.value })} />
                </Box>
                <FormControlLabel
                  control={<Checkbox checked={entry.useAEMMapping}
                    onChange={(e) => updateEntry(i, { useAEMMapping: e.target.checked })} />}
                  label="Rewrite links using the AEM path mapping (useAEMMapping)"
                />
              </Paper>
            ))}
            <Button startIcon={<AddIcon />} onClick={() => setEntries((p) => [...p, newEntry()])}>
              Add path
            </Button>

            <Divider sx={{ my: 3 }} />
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1, flexWrap: 'wrap' }}>
              <Typography variant="subtitle2" sx={{ flex: 1 }}>
                POST {json2htmlConfigUrl}
              </Typography>
              <ToggleButtonGroup
                size="small"
                exclusive
                value={shell}
                onChange={(_, value) => value && setShell(value)}
              >
                <ToggleButton value="powershell">PowerShell</ToggleButton>
                <ToggleButton value="bash">curl (bash)</ToggleButton>
              </ToggleButtonGroup>
            </Box>
            <Box
              component="pre"
              sx={{ p: 2, bgcolor: 'grey.100', borderRadius: 1, overflow: 'auto', fontSize: '0.8rem', maxHeight: 320 }}
            >
              {buildCurl('<your-admin-token>')}
            </Box>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              <Button variant="outlined" startIcon={<ContentCopyIcon />} disabled={!json2htmlPayload.length}
                onClick={() => copy(buildCurl('<your-admin-token>'), 'Command')}>
                Copy command
              </Button>
              <Tooltip title="Includes your admin token. Don't paste it anywhere it could be shared.">
                <span>
                  <Button variant="contained" startIcon={<ContentCopyIcon />}
                    disabled={!json2htmlPayload.length || !localStorage.getItem('authToken')}
                    onClick={() => copy(buildCurl(localStorage.getItem('authToken') || ''), 'Command with token')}>
                    Copy command with my token
                  </Button>
                </span>
              </Tooltip>
              <Button startIcon={<ContentCopyIcon />} disabled={!json2htmlPayload.length}
                onClick={() => copy(payloadJson, 'JSON')}>
                Copy JSON only
              </Button>
            </Box>
          </Paper>

          <Paper sx={{ p: 3, mb: 3, border: 1, borderColor: 'grey.300', order: 4 }}>
            <StepHeader step={4} title="Test" />
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Enter a fragment path to check the setup step by step. Checks use the forms above, including unsaved
              changes in step 1.
            </Typography>
            <OverlayTester
              owner={owner}
              site={site}
              branch={branch}
              savedOverlayUrl={content?.overlay?.url}
              expectedOverlayUrl={json2htmlOverlayUrl}
              mappings={mappings
                .filter((m) => m.source.trim() && m.target.trim())
                .map((m) => ({ source: m.source.trim(), target: m.target.trim() }))}
              rules={fragmentRules
                .filter((r) => r.glob.trim())
                .map((r) => ({ glob: r.glob.trim(), models: r.models }))}
              json2htmlEntries={json2htmlPayload}
              shell={shell}
            />
          </Paper>
        </Box>
      )}
    </Box>
  );
};

export default SiteConfigContentFragmentOverlay;
