import React, { useState } from 'react';
import {
  Box,
  Paper,
  Button,
  CircularProgress,
} from '@mui/material';
import { useResource } from '../context/ResourceContext';
import ApiUrlDisplay from '../components/ApiUrlDisplay';
import ErrorDisplay from '../components/ErrorDisplay';
import PageHeader from '../components/PageHeader';
import Form, { useFormState } from '../components/Form';
import ResponseDisplay from '../components/response/ResponseDisplay';
import SiteInputs from 'components/SiteInputs';
import JsonEditor from '../components/JsonEditor';
import { useErrorHandler } from '../hooks/useErrorHandler';
import WebIcon from '@mui/icons-material/Web';
import { RequestDetails, ADMIN_API_BASE } from '../types';

const SiteConfigCreateConfig: React.FC = () => {
  const { owner, site } = useResource();
  const [config, setConfig] = useState<any>({
    content: {},
    code: {},
    access: {}
  });
  const { status, responseData, error, loading, executeSubmit, reset, requestDetails } = useFormState();
  const { error: jsonError, handleError, clearError } = useErrorHandler();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();

    // Parse the config to ensure it's valid JSON
    let parsedConfig;
    try {
      parsedConfig = typeof config === 'string' ? JSON.parse(config) : config;
    } catch (error) {
      handleError(error, 'Invalid JSON configuration');
      return;
    }

    const details = {
      url: `${ADMIN_API_BASE}/config/${owner}/sites/${site}.json`,
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      queryParams: {},
      body: parsedConfig
    };
    executeSubmit(details);
  };

  return (
    <Box>
      <PageHeader
        title="Create Site Config"
        description="Creates a new site level configuration."
        icon={WebIcon}
        helpUrl="https://www.aem.live/docs/admin.html#putCreate-Site-Config"
      />

      <Paper sx={{ p: 3, mb: 3, border: 1, borderColor: 'grey.300' }}>
        <Form onSubmit={handleSubmit}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <SiteInputs />
            <JsonEditor
              value={config}
              onChange={setConfig}
              label="Site Configuration"
              required
              placeholder="Enter site configuration as JSON"
              helperText="Site configuration in JSON format."
            />
            <ApiUrlDisplay
              method="PUT"
              url={`${ADMIN_API_BASE}/config/${owner || '{owner}'}/sites/${site || '{site}'}.json`}
            />
            <Button
              variant="contained"
              type="submit"
              disabled={loading}
              startIcon={loading ? <CircularProgress size={20} /> : null}
            >
              Create Site Config
            </Button>
          </Box>
        </Form>
      </Paper>

      <ErrorDisplay 
        error={error || jsonError} 
        onDismiss={() => { reset(); clearError(); }}
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

export default SiteConfigCreateConfig; 