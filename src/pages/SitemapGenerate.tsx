import React, { useState } from 'react';
import {
  Box,
  Paper,
  Button,
  CircularProgress,
  Typography,
} from '@mui/material';
import MapIcon from '@mui/icons-material/Map';
import { useResource } from '../context/ResourceContext';
import ApiUrlDisplay from '../components/ApiUrlDisplay';
import ErrorDisplay from '../components/ErrorDisplay';
import PageHeader from '../components/PageHeader';
import Form, { useFormState } from '../components/Form';
import SitemapGenerateDisplay from '../components/response/SitemapGenerateDisplay';
import ResourceInputs from 'components/ResourceInputs';
import { apiCall } from '../utils/api';
import { getErrorMessage } from '../utils/errorUtils';
import { useErrorHandler } from '../hooks/useErrorHandler';
import { collectSitemapDestinations, yamlConfigUrl } from '../utils/siteConfig';
import { ADMIN_API_BASE } from '../types';

interface GenerateResult {
  path: string;
  outcome: string;
  ok: boolean;
}

// The Admin API allows about 10 requests per second per project.
const REQUEST_DELAY_MS = 150;

const sitemapUrl = (owner: string, site: string, ref: string, path: string) =>
  `${ADMIN_API_BASE}/sitemap/${owner}/${site}/${ref}/${path.replace(/^\/+/, '')}`;

const SitemapGenerate: React.FC = () => {
  const { owner, site, ref, path, updateHistory } = useResource();
  const { status, responseData, error, loading, executeSubmit, reset, requestDetails } = useFormState();
  const { error: allError, handleError, clearError } = useErrorHandler();
  const [generatingAll, setGeneratingAll] = useState(false);
  const [results, setResults] = useState<GenerateResult[]>([]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const details = {
      url: sitemapUrl(owner, site, ref, path),
      method: 'POST',
      headers: {},
      queryParams: {},
      body: {}
    };
    executeSubmit(details);
  };

  const handleGenerateAll = async () => {
    clearError();
    setResults([]);
    setGeneratingAll(true);
    try {
      const { responseData: yamlText } = await apiCall({
        url: yamlConfigUrl(owner, site, 'sitemap.yaml'),
        method: 'GET',
        headers: {},
        queryParams: {},
        body: null,
      });
      const destinations = collectSitemapDestinations(typeof yamlText === 'string' ? yamlText : '');
      if (destinations.length === 0) {
        setResults([{ path: 'sitemap.yaml', outcome: 'No destination found', ok: false }]);
        return;
      }
      for (let i = 0; i < destinations.length; i += 1) {
        const destination = destinations[i];
        if (i > 0) await new Promise((resolve) => setTimeout(resolve, REQUEST_DELAY_MS));
        let result: GenerateResult;
        try {
          const { status: s, responseData: data } = await apiCall({
            url: sitemapUrl(owner, site, ref, destination),
            method: 'POST',
            headers: {},
            queryParams: {},
            body: {},
          });
          result = s === 204
            ? { path: destination, outcome: 'Not a destination of any configured sitemap', ok: false }
            : { path: destination, outcome: `Generated: ${(data?.paths ?? []).join(', ') || s}`, ok: true };
        } catch (err) {
          result = { path: destination, outcome: getErrorMessage(err), ok: false };
        }
        setResults((prev) => [...prev, result]);
      }
      updateHistory();
    } catch (err) {
      handleError(err, 'Generate all sitemaps');
    } finally {
      setGeneratingAll(false);
    }
  };

  return (
    <Box>
      <PageHeader
        title="Generate Sitemap"
        description="The path must be the destination path of a sitemap configured in sitemap.yaml, for example /sitemap-corporate-de.xml."
        helpUrl="https://www.aem.live/docs/admin.html#tag/sitemap/operation/generateSitemap"
        icon={MapIcon}
      />

      <Paper sx={{ p: 3, mb: 3, border: 1, borderColor: 'grey.300' }}>
        <Form onSubmit={handleSubmit}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <ResourceInputs
              defaultPath="/sitemap.xml"
              pathHelperText="Destination of a configured sitemap, e.g. /sitemap.xml (not *)"
            />
            <ApiUrlDisplay
              method="POST"
              url={sitemapUrl(owner || '{owner}', site || '{site}', ref || '{ref}', path || '{path}')}
            />
            <Box sx={{ display: 'flex', gap: 2 }}>
              <Button
                variant="contained"
                type="submit"
                disabled={loading || generatingAll}
                startIcon={loading ? <CircularProgress size={20} /> : null}
              >
                Generate Sitemap
              </Button>
              <Button
                variant="outlined"
                disabled={loading || generatingAll || !owner || !site || !ref}
                onClick={handleGenerateAll}
                startIcon={generatingAll ? <CircularProgress size={20} /> : null}
              >
                Generate all
              </Button>
            </Box>
          </Box>
        </Form>
      </Paper>

      <ErrorDisplay
        error={error || allError}
        onDismiss={() => { reset(); clearError(); }}
        requestDetails={requestDetails}
      />

      {results.length > 0 && (
        <Paper sx={{ p: 2, mb: 3, border: 1, borderColor: 'grey.300' }}>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 1 }}>
            Generate all (destinations read from sitemap.yaml):
          </Typography>
          {results.map((r) => (
            <Typography
              key={r.path}
              variant="body2"
              color={r.ok ? 'success.main' : 'error.main'}
              sx={{ ml: 2 }}
            >
              {'\u2022'} {r.path}: {r.outcome}
            </Typography>
          ))}
        </Paper>
      )}

      {status && (
        <SitemapGenerateDisplay
          requestDetails={requestDetails}
          responseData={responseData}
          responseStatus={status}
        />
      )}
    </Box>
  );
};

export default SitemapGenerate; 