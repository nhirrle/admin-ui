import React, { useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Link,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  TextField,
  Typography,
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import WarningIcon from '@mui/icons-material/Warning';
import InfoIcon from '@mui/icons-material/Info';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import ErrorDisplay from './ErrorDisplay';
import { apiCall } from '../utils/api';
import { ErrorDetails, parseApiError } from '../utils/errorUtils';
import { psQuote, Shell, shellQuote } from '../utils/shell';
import { useSnackbar } from '../context/SnackbarContext';
import { ADMIN_API_BASE, RequestDetails } from '../types';

type Severity = 'ok' | 'warn' | 'error' | 'info';
interface Check { severity: Severity; title: string; detail?: React.ReactNode }

interface OverlayTesterProps {
  owner: string;
  site: string;
  branch: string;
  savedOverlayUrl?: string;
  expectedOverlayUrl: string;
  mappings: { source: string; target: string }[];
  rules: { glob: string; models: string[] }[];
  json2htmlEntries: Record<string, any>[];
  shell: Shell;
}

const icons: Record<Severity, React.ReactElement> = {
  ok: <CheckCircleIcon color="success" />,
  warn: <WarningIcon color="warning" />,
  error: <ErrorIcon color="error" />,
  info: <InfoIcon color="info" />,
};

const longestPrefix = <T,>(items: T[], value: string, key: (item: T) => string) =>
  items
    .filter((item) => key(item) && value.startsWith(key(item)))
    .sort((a, b) => key(b).length - key(a).length)[0];

const globToRegExp = (glob: string) => new RegExp(`^${glob
  .replace(/[.+^${}()|[\]\\]/g, '\\$&')
  .split('**')
  .map((part) => part.replace(/\*/g, '[^/]*').replace(/\?/g, '[^/]'))
  .join('.*')}$`);

// json2html expects regexes as "/pattern/flags" strings
const parseRegex = (value: string) => {
  const literal = value.match(/^\/([\s\S]*)\/([a-z]*)$/);
  return literal ? new RegExp(literal[1], literal[2]) : new RegExp(value);
};

const withSlash = (value: string) => (value.startsWith('/') ? value : `/${value}`);

const OverlayTester: React.FC<OverlayTesterProps> = ({
  owner, site, branch, savedOverlayUrl, expectedOverlayUrl, mappings, rules, json2htmlEntries, shell,
}) => {
  const { showSuccess, showError } = useSnackbar();
  const [input, setInput] = useState('');
  const [previewing, setPreviewing] = useState(false);
  const [previewResult, setPreviewResult] = useState<any>(null);
  const [previewError, setPreviewError] = useState<ErrorDetails | null>(null);
  const [previewRequest, setPreviewRequest] = useState<RequestDetails | null>(null);

  const analysis = useMemo(() => {
    const raw = input.trim();
    if (!raw) return null;
    const checks: Check[] = [];
    const value = withSlash(raw.replace(/^https?:\/\/[^/]+/, ''));
    const isAemPath = value.startsWith('/content/');

    let publicPath = value;
    let aemPath: string | undefined = isAemPath ? value : undefined;
    if (isAemPath) {
      const mapping = longestPrefix(mappings, value, (m) => m.source);
      if (mapping) {
        publicPath = mapping.target + value.slice(mapping.source.length);
        checks.push({ severity: 'ok', title: `Maps to public path ${publicPath}`, detail: `${mapping.source} → ${mapping.target}` });
      } else {
        checks.push({ severity: 'error', title: 'No path mapping covers this AEM path', detail: 'Add a mapping in step 2.' });
      }
    } else {
      const mapping = longestPrefix(mappings, value, (m) => m.target);
      if (mapping) {
        aemPath = mapping.source + value.slice(mapping.target.length);
        checks.push({ severity: 'ok', title: `Comes from AEM path ${aemPath}`, detail: `${mapping.source} → ${mapping.target}` });
      } else {
        checks.push({ severity: 'warn', title: 'No path mapping covers this public path', detail: 'Without a mapping the Admin API cannot locate the fragment in AEM.' });
      }
    }

    if (aemPath) {
      const rule = rules.find((r) => r.glob && globToRegExp(r.glob).test(aemPath!));
      if (rule) {
        checks.push({
          severity: rule.models.length ? 'ok' : 'warn',
          title: `Fragment rule ${rule.glob} applies`,
          detail: rule.models.length ? `Allowed models: ${rule.models.join(', ')}` : 'No models allowed yet.',
        });
      } else {
        checks.push({ severity: 'error', title: 'No fragment overlay rule matches', detail: 'The fragment will not be converted. Add a rule in step 2.' });
      }
    }

    if (!savedOverlayUrl) {
      checks.push({ severity: 'error', title: 'No overlay saved', detail: 'Save the overlay in step 1.' });
    } else if (savedOverlayUrl.replace(/\/$/, '') === expectedOverlayUrl) {
      checks.push({ severity: 'ok', title: 'Overlay points to json2html for this site and branch' });
    } else {
      checks.push({ severity: 'warn', title: 'Overlay points elsewhere', detail: `Saved: ${savedOverlayUrl} — expected: ${expectedOverlayUrl}` });
    }

    const entry = longestPrefix(json2htmlEntries, publicPath, (e) => e.path);
    let endpoint: string | undefined;
    if (!entry) {
      checks.push({ severity: 'error', title: 'No json2html path matches', detail: 'Add a path in step 3 (and run the command).' });
    } else {
      checks.push({ severity: 'ok', title: `json2html path ${entry.path} applies`, detail: 'Based on the step 3 form; make sure the command was run.' });
      endpoint = entry.endpoint;
      if (endpoint?.includes('{{id}}')) {
        if (!entry.regex) {
          checks.push({ severity: 'error', title: 'Endpoint uses {{id}} but no regex is set' });
        } else {
          try {
            const match = publicPath.match(parseRegex(entry.regex));
            if (match) {
              endpoint = endpoint.replace(/\{\{id\}\}/g, match[0]);
              checks.push({
                severity: 'ok',
                title: `Regex extracts id "${match[0]}"`,
                detail: match[1] !== undefined && match[1] !== match[0] ? `Capture group 1 would be "${match[1]}"` : undefined,
              });
            } else {
              checks.push({ severity: 'error', title: 'Regex does not match this path', detail: entry.regex });
            }
          } catch (e) {
            checks.push({ severity: 'error', title: 'Invalid regex', detail: (e as Error).message });
          }
        }
      }
      if (/author-p\d+/.test(entry.endpoint) && !(entry.forwardHeaders || []).some((h: string) => h.toLowerCase() === 'authorization')) {
        checks.push({ severity: 'warn', title: 'AEM author endpoint without forwarded Authorization', detail: 'Requests to author will fail with 401.' });
      }
      if (!entry.template) {
        checks.push({ severity: 'info', title: 'No template set', detail: 'json2html will render generic nested divs.' });
      }
    }

    return { checks, publicPath, endpoint, entry };
  }, [input, mappings, rules, json2htmlEntries, savedOverlayUrl, expectedOverlayUrl]);

  const overlayBase = (savedOverlayUrl || expectedOverlayUrl).replace(/\/$/, '');
  const renderUrl = analysis ? `${overlayBase}${analysis.publicPath}` : '';
  const previewPageUrl = analysis ? `https://${branch}--${site}--${owner}.aem.page${analysis.publicPath}` : '';
  const templateUrl = analysis?.entry?.template
    ? `https://${branch}--${site}--${owner}.aem.page${withSlash(analysis.entry.template)}`
    : '';

  const testCommand = shell === 'powershell'
    ? [
      `$r = Invoke-WebRequest ${psQuote(renderUrl)} -SkipHttpErrorCheck \``,
      `  -Headers @{ Authorization = 'Bearer <aem-author-token>' }`,
      `$r.StatusCode; $r.Headers['x-error']; $r.Content`,
    ].join('\n')
    : `curl -i ${shellQuote(renderUrl)} -H 'Authorization: Bearer <aem-author-token>'`;

  const copyCommand = async () => {
    try {
      await navigator.clipboard.writeText(testCommand);
      showSuccess('Test command copied to clipboard');
    } catch {
      showError('Could not access clipboard');
    }
  };

  const runPreview = async () => {
    if (!analysis) return;
    const details: RequestDetails = {
      url: `${ADMIN_API_BASE}/preview/${owner}/${site}/${branch}${analysis.publicPath}`,
      method: 'POST',
      headers: {},
      queryParams: {},
      body: null,
    };
    setPreviewing(true);
    setPreviewError(null);
    setPreviewResult(null);
    setPreviewRequest(details);
    try {
      const { responseData } = await apiCall(details);
      setPreviewResult(responseData);
      showSuccess('Preview succeeded');
    } catch (e) {
      setPreviewError(parseApiError(e));
    } finally {
      setPreviewing(false);
    }
  };

  const linkButton = (href: string, label: string, disabled = false) => (
    <Button
      variant="outlined"
      size="small"
      startIcon={<OpenInNewIcon />}
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      disabled={disabled || !href}
    >
      {label}
    </Button>
  );

  return (
    <Box>
      <TextField
        label="Fragment path"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder="/press/my-fragment  or  /content/dam/my-site/press/my-fragment"
        helperText="Public path or AEM DAM path of a Content Fragment"
        fullWidth
        sx={{ mb: 2 }}
      />

      {analysis && (
        <>
          <Typography variant="subtitle2">Pre-flight checks</Typography>
          <List dense>
            {analysis.checks.map((check, i) => (
              <ListItem key={i} disableGutters>
                <ListItemIcon sx={{ minWidth: 36 }}>{icons[check.severity]}</ListItemIcon>
                <ListItemText primary={check.title} secondary={check.detail} />
              </ListItem>
            ))}
          </List>

          <Typography variant="subtitle2" sx={{ mt: 1, mb: 1 }}>Check each part</Typography>
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 1 }}>
            {linkButton(analysis.endpoint && !analysis.endpoint.includes('{{') ? analysis.endpoint : '', 'Source JSON')}
            {linkButton(templateUrl, 'Template')}
            {linkButton(renderUrl, 'json2html output')}
          </Box>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Source JSON opens with your browser login (works for AEM author if you are signed in).
            The json2html output only works in the browser for public endpoints; for AEM author use the command below
            with a token from the AEM Developer Console.
          </Typography>

          <Box
            component="pre"
            sx={{ p: 2, bgcolor: 'grey.100', borderRadius: 1, overflow: 'auto', fontSize: '0.8rem' }}
          >
            {testCommand}
          </Box>
          <Button size="small" startIcon={<ContentCopyIcon />} onClick={copyCommand} sx={{ mb: 3 }}>
            Copy test command
          </Button>

          <Typography variant="subtitle2" sx={{ mb: 1 }}>End-to-end</Typography>
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2 }}>
            <Button
              variant="contained"
              size="small"
              startIcon={previewing ? <CircularProgress size={18} /> : <PlayArrowIcon />}
              onClick={runPreview}
              disabled={previewing}
            >
              Preview {analysis.publicPath}
            </Button>
            {linkButton(previewPageUrl, 'Open preview page', !previewResult)}
          </Box>

          {previewResult && (
            <Alert severity="success" sx={{ mb: 2 }}>
              Previewed via the overlay
              {previewResult.preview?.url && (
                <> — <Link href={previewResult.preview.url} target="_blank" rel="noopener noreferrer">{previewResult.preview.url}</Link></>
              )}
              {previewResult.preview?.sourceLocation && (
                <Typography variant="body2">Source: {previewResult.preview.sourceLocation}</Typography>
              )}
            </Alert>
          )}
          <ErrorDisplay error={previewError} onDismiss={() => setPreviewError(null)} requestDetails={previewRequest} />
        </>
      )}
    </Box>
  );
};

export default OverlayTester;
