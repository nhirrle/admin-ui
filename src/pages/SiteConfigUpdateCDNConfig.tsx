import React, { useEffect, useRef, useState } from 'react';
import {
  Box,
  Paper,
  Button,
  CircularProgress,
} from '@mui/material';
import WebIcon from '@mui/icons-material/Web';
import { useResource } from '../context/ResourceContext';
import ApiUrlDisplay from '../components/ApiUrlDisplay';
import ErrorDisplay from '../components/ErrorDisplay';
import PageHeader from '../components/PageHeader';
import Form, { useFormState } from '../components/Form';
import ResponseDisplay from '../components/response/ResponseDisplay';
import SiteInputs from 'components/SiteInputs';
import JsonEditor from '../components/JsonEditor';
import { apiCall } from 'utils/api';
import { ADMIN_API_BASE } from '../types';
import { parseApiError } from '../utils/errorUtils';

const SiteConfigUpdateCDNConfig: React.FC = () => {
  const { owner, site } = useResource();
  const [config, setConfig] = useState<any>({});
  const [loadError, setLoadError] = useState<ReturnType<typeof parseApiError> | null>(null);
  const { status, responseData, error, loading, executeSubmit, reset, requestDetails } = useFormState();
  const jsonEditorRef = useRef<any>(null);

  useEffect(() => {
    let active = true;
    setConfig({});
    setLoadError(null);

    const fetchConfig = async () => {
      if (!owner || !site) return;

      try {
        const { status, responseData } = await apiCall({
          url: `${ADMIN_API_BASE}/config/${owner}/sites/${site}/cdn.json`,
          method: 'GET',
          headers: {},
          queryParams: {},
          body: null,
        });
        if (active && status === 200) {
          setConfig(responseData);
        }
      } catch (fetchError) {
        if (active) {
          setConfig({});
          setLoadError(parseApiError(fetchError));
        }
      }
    };

    fetchConfig();
    return () => {
      active = false;
    };
  }, [owner, site]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoadError(null);

    const details = {
      url: `${ADMIN_API_BASE}/config/${owner}/sites/${site}/cdn.json`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      queryParams: {},
      body: jsonEditorRef.current?.getLatestValue() || config,
    };
    executeSubmit(details);
  };

  return (
    <Box>
      <PageHeader
        title="Update CDN Config"
        description="Updates production CDN settings, including push invalidation configuration."
        icon={WebIcon}
        helpUrl="https://www.aem.live/docs/setup-byo-cdn-push-invalidation"
      />

      <Paper sx={{ p: 3, mb: 3, border: 1, borderColor: 'grey.300' }}>
        <Form onSubmit={handleSubmit}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <SiteInputs />
            <JsonEditor
              ref={jsonEditorRef}
              value={config}
              onChange={setConfig}
              label="CDN Configuration"
              required
              placeholder="Enter CDN configuration as JSON"
              helperText="Provide the production CDN settings under prod, using the fields for your CDN provider."
            />
            <ApiUrlDisplay
              method="POST"
              url={`${ADMIN_API_BASE}/config/${owner || '{org}'}/sites/${site || '{site}'}/cdn.json`}
            />
            <Button
              variant="contained"
              type="submit"
              disabled={loading}
              startIcon={loading ? <CircularProgress size={20} /> : null}
            >
              Update CDN Config
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

export default SiteConfigUpdateCDNConfig;