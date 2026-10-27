import React, { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  IconButton,
  Paper,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import WebIcon from '@mui/icons-material/Web';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import { useResource } from '../context/ResourceContext';
import ApiUrlDisplay from '../components/ApiUrlDisplay';
import ErrorDisplay from '../components/ErrorDisplay';
import PageHeader from '../components/PageHeader';
import Form, { useFormState } from '../components/Form';
import ResponseDisplay from '../components/response/ResponseDisplay';
import SiteInputs from 'components/SiteInputs';
import { apiCall } from 'utils/api';
import { ADMIN_API_BASE } from '../types';
import { isNotFoundError, parseApiError } from '../utils/errorUtils';

interface HeaderEntry {
  key: string;
  value: string;
}

interface HeaderRule {
  id: number;
  url: string;
  headers: HeaderEntry[];
}

let nextRuleId = 1;
const newRule = (url = '', headers: HeaderEntry[] = [{ key: '', value: '' }]): HeaderRule => ({
  id: nextRuleId++,
  url,
  headers,
});

const toRules = (data: any): HeaderRule[] => {
  if (!data || typeof data !== 'object') return [];
  return Object.entries(data).map(([url, entries]) =>
    newRule(
      url,
      Array.isArray(entries)
        ? entries.map((e: any) => ({ key: String(e?.key ?? ''), value: String(e?.value ?? '') }))
        : []
    )
  );
};

const toConfig = (rules: HeaderRule[]): Record<string, HeaderEntry[]> => {
  const config: Record<string, HeaderEntry[]> = {};
  rules.forEach((rule) => {
    const url = rule.url.trim();
    const headers = rule.headers
      .filter((h) => h.key.trim())
      .map((h) => ({ key: h.key.trim(), value: h.value }));
    if (url && headers.length) {
      config[url] = [...(config[url] || []), ...headers];
    }
  });
  return config;
};

const SiteConfigUpdateHeaders: React.FC = () => {
  const { owner, site } = useResource();
  const [rules, setRules] = useState<HeaderRule[]>([]);
  const [loadError, setLoadError] = useState<ReturnType<typeof parseApiError> | null>(null);
  const { status, responseData, error, loading, executeSubmit, reset, requestDetails } = useFormState();

  const apiUrl = `${ADMIN_API_BASE}/config/${owner || '{owner}'}/sites/${site || '{site}'}/headers.json`;

  useEffect(() => {
    let active = true;
    setRules([]);
    setLoadError(null);

    const fetchHeaders = async () => {
      if (!owner || !site) return;
      try {
        const { status, responseData } = await apiCall({
          url: `${ADMIN_API_BASE}/config/${owner}/sites/${site}/headers.json`,
          method: 'GET',
          headers: {},
          queryParams: {},
          body: null,
        });
        if (active && status === 200) {
          setRules(toRules(responseData));
        }
      } catch (fetchError) {
        // 404 means no headers are configured yet
        if (active && !isNotFoundError(fetchError)) {
          setLoadError(parseApiError(fetchError));
        }
      }
    };

    fetchHeaders();
    return () => {
      active = false;
    };
  }, [owner, site]);

  const updateRule = (id: number, patch: Partial<HeaderRule>) =>
    setRules((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));

  const updateHeader = (id: number, index: number, patch: Partial<HeaderEntry>) =>
    setRules((prev) =>
      prev.map((r) =>
        r.id === id
          ? { ...r, headers: r.headers.map((h, i) => (i === index ? { ...h, ...patch } : h)) }
          : r
      )
    );

  const addHeader = (id: number) =>
    setRules((prev) =>
      prev.map((r) => (r.id === id ? { ...r, headers: [...r.headers, { key: '', value: '' }] } : r))
    );

  const removeHeader = (id: number, index: number) =>
    setRules((prev) =>
      prev.map((r) => (r.id === id ? { ...r, headers: r.headers.filter((_, i) => i !== index) } : r))
    );

  const removeRule = (id: number) => setRules((prev) => prev.filter((r) => r.id !== id));

  const config = toConfig(rules);
  const hasWildcardOrigin = Object.values(config).some((entries) =>
    entries.some((h) => h.key.toLowerCase() === 'access-control-allow-origin' && h.value.trim() === '*')
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoadError(null);
    executeSubmit({
      url: `${ADMIN_API_BASE}/config/${owner}/sites/${site}/headers.json`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      queryParams: {},
      body: config,
    });
  };

  return (
    <Box>
      <PageHeader
        title="Update Custom Headers"
        description="Edits the custom HTTP response headers applied to preview and live, per URL pattern."
        icon={WebIcon}
        helpUrl="https://www.aem.live/docs/custom-headers"
      />

      <Paper sx={{ p: 3, mb: 3, border: 1, borderColor: 'grey.300' }}>
        <Form onSubmit={handleSubmit}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <SiteInputs />

            {hasWildcardOrigin && (
              <Alert severity="warning">
                access-control-allow-origin with value * can expose protected preview and live
                environments to CSRF attacks against authors logged in via Sidekick. Restrict it to a
                single origin or to specific URLs.
              </Alert>
            )}

            {rules.length === 0 && (
              <Typography variant="body2" color="textSecondary">
                No header rules configured. Saving with no rules will clear all custom headers.
              </Typography>
            )}

            {rules.map((rule) => (
              <Paper key={rule.id} variant="outlined" sx={{ p: 2 }}>
                <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start', mb: 1 }}>
                  <TextField
                    label="URL pattern"
                    value={rule.url}
                    onChange={(e) => updateRule(rule.id, { url: e.target.value })}
                    placeholder="/fragments/**"
                    helperText="Glob matched against the URL path, e.g. /foo/**, **/bar/**"
                    size="small"
                    fullWidth
                    required
                    sx={{ '& .MuiInputBase-root': { fontFamily: 'monospace' } }}
                  />
                  <Tooltip title="Remove rule">
                    <IconButton onClick={() => removeRule(rule.id)} aria-label="Remove rule">
                      <DeleteIcon />
                    </IconButton>
                  </Tooltip>
                </Box>

                {rule.headers.map((header, index) => (
                  <Box key={index} sx={{ display: 'flex', gap: 1, mb: 1 }}>
                    <TextField
                      label="Header"
                      value={header.key}
                      onChange={(e) => updateHeader(rule.id, index, { key: e.target.value })}
                      placeholder="access-control-allow-origin"
                      size="small"
                      sx={{ flex: 1, '& .MuiInputBase-root': { fontFamily: 'monospace' } }}
                    />
                    <TextField
                      label="Value"
                      value={header.value}
                      onChange={(e) => updateHeader(rule.id, index, { value: e.target.value })}
                      placeholder="https://www.example.com"
                      size="small"
                      sx={{ flex: 2, '& .MuiInputBase-root': { fontFamily: 'monospace' } }}
                    />
                    <Tooltip title="Remove header">
                      <IconButton onClick={() => removeHeader(rule.id, index)} aria-label="Remove header">
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Box>
                ))}

                <Button size="small" startIcon={<AddIcon />} onClick={() => addHeader(rule.id)}>
                  Add header
                </Button>
              </Paper>
            ))}

            <Box>
              <Button variant="outlined" startIcon={<AddIcon />} onClick={() => setRules((prev) => [...prev, newRule()])}>
                Add URL rule
              </Button>
            </Box>

            <ApiUrlDisplay method="POST" url={apiUrl} />
            <Button
              variant="contained"
              type="submit"
              disabled={loading}
              startIcon={loading ? <CircularProgress size={20} /> : null}
            >
              Update Custom Headers
            </Button>
          </Box>
        </Form>
      </Paper>

      <ErrorDisplay
        error={error || loadError}
        onDismiss={() => { reset(); setLoadError(null); }}
        requestDetails={requestDetails}
      />

      {status && (
        <ResponseDisplay
          requestDetails={requestDetails}
          responseData={responseData}
          responseStatus={status}
        />
      )}
    </Box>
  );
};

export default SiteConfigUpdateHeaders;
