import React, { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Checkbox,
  CircularProgress,
  FormControlLabel,
  FormGroup,
  Paper,
  TextField,
  Typography,
} from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import { useResource } from '../context/ResourceContext';
import { useSnackbar } from '../context/SnackbarContext';
import ApiUrlDisplay from '../components/ApiUrlDisplay';
import ErrorDisplay from '../components/ErrorDisplay';
import PageHeader from '../components/PageHeader';
import Form, { useFormState } from '../components/Form';
import ResponseDisplay from '../components/response/ResponseDisplay';
import SiteInputs from '../components/SiteInputs';
import JsonEditor from '../components/JsonEditor';
import { useErrorHandler } from '../hooks/useErrorHandler';
import { apiCall } from '../utils/api';
import { ApiError } from '../utils/errorUtils';
import {
  detectSitemapHost,
  fetchRobotsTxt,
  fetchSiteConfig,
  fetchSiteNames,
  findTechAccounts,
  prepareClone,
  replaceSitemapHost,
} from '../utils/siteConfig';
import { ADMIN_API_BASE } from '../types';

const SITE_NAME_PATTERN = /^[a-z0-9][a-z0-9-]*$/;

const SiteConfigCloneSite: React.FC = () => {
  const { owner, site } = useResource();
  const { showSuccess, showWarning } = useSnackbar();
  const [siteNames, setSiteNames] = useState<string[]>([]);
  const [source, setSource] = useState(site);
  const [target, setTarget] = useState('');
  const [includeCdn, setIncludeCdn] = useState(false);
  const [includeAccess, setIncludeAccess] = useState(true);
  const [copyRobots, setCopyRobots] = useState(true);
  const [sourceConfig, setSourceConfig] = useState<any>(null);
  const [sourceRobots, setSourceRobots] = useState('');
  const [techAccounts, setTechAccounts] = useState<Record<string, string>>({});
  const [contentUrl, setContentUrl] = useState('');
  const [cdnHost, setCdnHost] = useState('');
  const [sitemapHost, setSitemapHost] = useState('');
  const [prepared, setPrepared] = useState<any>(null);
  const [robotsTxt, setRobotsTxt] = useState('');
  const [preparing, setPreparing] = useState(false);
  const robotsPending = useRef<{ to: string; content: string } | null>(null);
  const { status, responseData, error, loading, executeSubmit, reset, requestDetails } = useFormState();
  const { error: localError, handleError, clearError } = useErrorHandler();

  useEffect(() => {
    if (!owner) return;
    fetchSiteNames(owner).then(setSiteNames).catch(() => setSiteNames([]));
  }, [owner]);

  useEffect(() => {
    setSourceConfig(null);
    setSourceRobots('');
  }, [owner, source, target]);

  // Manual JSON edits are overwritten when a replacement field changes.
  useEffect(() => {
    setPrepared(sourceConfig
      ? prepareClone(sourceConfig, { includeCdn, includeAccess, techAccounts, contentUrl, cdnHost })
      : null);
  }, [sourceConfig, includeCdn, includeAccess, techAccounts, contentUrl, cdnHost]);

  useEffect(() => {
    setRobotsTxt(replaceSitemapHost(sourceRobots, sitemapHost));
  }, [sourceRobots, sitemapHost]);

  // robots.txt can only be written once the target site exists.
  useEffect(() => {
    const pending = robotsPending.current;
    if (!pending || !status || status >= 300) return;
    robotsPending.current = null;
    (async () => {
      try {
        await apiCall({
          url: `${ADMIN_API_BASE}/config/${owner}/sites/${pending.to}/robots.txt`,
          method: 'POST',
          headers: { 'content-type': 'text/plain', accept: 'text/plain' },
          queryParams: {},
          body: pending.content,
        });
        showSuccess('robots.txt copied');
      } catch (e) {
        showWarning(`Site created, but robots.txt could not be copied: ${e instanceof Error ? e.message : e}`);
      }
    })();
  }, [status, owner, showSuccess, showWarning]);

  const targetError = target && !SITE_NAME_PATTERN.test(target)
    ? 'Use lowercase letters, digits and dashes only'
    : target && target === source ? 'Target must differ from source' : '';

  const sourceContentUrl = sourceConfig?.content?.source?.url ?? '';
  const sourceCdnHost = sourceConfig?.cdn?.prod?.host ?? '';
  const sourceSitemapHost = detectSitemapHost(sourceRobots);
  const cdnHostUnchanged = includeCdn && !!sourceCdnHost && cdnHost.trim() === sourceCdnHost;

  const handleLoadSource = async () => {
    clearError();
    reset();
    setPreparing(true);
    try {
      if (siteNames.includes(target)) {
        throw new ApiError(`Site "${target}" already exists in ${owner}`, 409, undefined, 'VALIDATION');
      }
      const [config, robots] = await Promise.all([
        fetchSiteConfig(owner, source),
        fetchRobotsTxt(owner, source).catch(() => ''),
      ]);
      setTechAccounts(Object.fromEntries(findTechAccounts(config).map((account) => [account, ''])));
      setContentUrl(config?.content?.source?.url ?? '');
      setCdnHost(config?.cdn?.prod?.host ?? '');
      setSitemapHost(detectSitemapHost(robots));
      setSourceRobots(robots);
      setSourceConfig(config);
    } catch (e) {
      handleError(e, 'Preparing clone');
    } finally {
      setPreparing(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    let body;
    try {
      body = typeof prepared === 'string' ? JSON.parse(prepared) : prepared;
    } catch (err) {
      handleError(err, 'Invalid JSON configuration');
      return;
    }
    robotsPending.current = copyRobots && robotsTxt.trim() ? { to: target, content: robotsTxt } : null;
    await executeSubmit({
      url: `${ADMIN_API_BASE}/config/${owner}/sites/${target}.json`,
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      queryParams: {},
      body,
    });
  };

  return (
    <Box>
      <PageHeader
        title="Clone Site"
        description="Creates a new site in the same organization based on the configuration of an existing site."
        icon={ContentCopyIcon}
        helpUrl="https://www.aem.live/docs/admin.html#putCreate-Site-Config"
      />

      <Paper sx={{ p: 3, mb: 3, border: 1, borderColor: 'grey.300' }}>
        <Form onSubmit={handleSubmit}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <SiteInputs hideSite />
            <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 2 }}>
              <Autocomplete
                freeSolo
                options={siteNames}
                value={source}
                onChange={(_, v) => setSource(v || '')}
                sx={{ flex: 1 }}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Source site"
                    required
                    onChange={(e) => setSource(e.target.value)}
                    helperText="Existing site to clone from"
                  />
                )}
              />
              <TextField
                label="Target site"
                required
                value={target}
                onChange={(e) => setTarget(e.target.value.trim().toLowerCase())}
                error={!!targetError}
                helperText={targetError || 'Name of the new site'}
                sx={{ flex: 1 }}
              />
            </Box>

            <FormGroup row>
              <FormControlLabel
                control={<Checkbox checked={includeAccess} onChange={(e) => setIncludeAccess(e.target.checked)} />}
                label="Include access config"
              />
              <FormControlLabel
                control={<Checkbox checked={includeCdn} onChange={(e) => setIncludeCdn(e.target.checked)} />}
                label="Include CDN config"
              />
              <FormControlLabel
                control={<Checkbox checked={copyRobots} onChange={(e) => setCopyRobots(e.target.checked)} />}
                label="Copy robots.txt"
              />
            </FormGroup>

            <Alert severity="info">
              Server-managed and site-bound fields (name, created, lastModified, contentBusId, API keys, tokens, secrets)
              are never copied. API keys and tokens must be recreated for the new site.
            </Alert>

            <Button
              variant="outlined"
              onClick={handleLoadSource}
              disabled={preparing || !owner || !source || !target || !!targetError}
              startIcon={preparing ? <CircularProgress size={20} /> : null}
            >
              Load source site
            </Button>

            {prepared && (
              <>
                <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>Site-specific values</Typography>

                {includeAccess && Object.keys(techAccounts).map((account) => (
                  <TextField
                    key={account}
                    label="Technical account"
                    placeholder="XXXXXXXXXXXXXXXXXXXXXXXX@techacct.adobe.com"
                    value={techAccounts[account]}
                    onChange={(e) => setTechAccounts((prev) => ({ ...prev, [account]: e.target.value }))}
                    helperText={`Replaces ${account} in all access roles. Leave empty to remove it.`}
                  />
                ))}

                {sourceContentUrl && (
                  <TextField
                    label="Content source URL"
                    value={contentUrl}
                    onChange={(e) => setContentUrl(e.target.value)}
                    color={contentUrl.trim() === sourceContentUrl ? 'warning' : undefined}
                    focused={contentUrl.trim() === sourceContentUrl ? true : undefined}
                    helperText={contentUrl.trim() === sourceContentUrl
                      ? 'Same as source — both sites will share the same content.'
                      : `Source: ${sourceContentUrl}`}
                  />
                )}

                {includeCdn && sourceCdnHost && (
                  <TextField
                    label="Production CDN host"
                    value={cdnHost}
                    onChange={(e) => setCdnHost(e.target.value)}
                    error={cdnHostUnchanged}
                    helperText={cdnHostUnchanged
                      ? 'Must differ from the source site host.'
                      : `Source: ${sourceCdnHost}`}
                  />
                )}

                {copyRobots && sourceRobots && (
                  <>
                    {sourceSitemapHost && (
                      <TextField
                        label="Sitemap host"
                        value={sitemapHost}
                        onChange={(e) => setSitemapHost(e.target.value)}
                        color={sitemapHost.trim() === sourceSitemapHost ? 'warning' : undefined}
                        focused={sitemapHost.trim() === sourceSitemapHost ? true : undefined}
                        helperText={`Replaces the host of all Sitemap: lines. Source: ${sourceSitemapHost}`}
                      />
                    )}
                    <TextField
                      multiline
                      minRows={4}
                      label="robots.txt for the new site"
                      value={robotsTxt}
                      onChange={(e) => setRobotsTxt(e.target.value)}
                      sx={{ '& .MuiInputBase-root': { fontFamily: 'monospace' } }}
                    />
                  </>
                )}

                <JsonEditor
                  value={prepared}
                  onChange={setPrepared}
                  label={`Configuration for "${target}" (review & edit before creating)`}
                  required
                />
                <ApiUrlDisplay method="PUT" url={`${ADMIN_API_BASE}/config/${owner}/sites/${target}.json`} />
                <Button
                  variant="contained"
                  type="submit"
                  disabled={loading || cdnHostUnchanged}
                  startIcon={loading ? <CircularProgress size={20} /> : null}
                >
                  Create site “{target}”
                </Button>
              </>
            )}
          </Box>
        </Form>
      </Paper>

      <ErrorDisplay
        error={error || localError}
        onDismiss={() => { reset(); clearError(); }}
        requestDetails={requestDetails}
      />

      {status && (
        <ResponseDisplay requestDetails={requestDetails} responseData={responseData} responseStatus={status} />
      )}
    </Box>
  );
};

export default SiteConfigCloneSite;
