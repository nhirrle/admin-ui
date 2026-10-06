import React, { useRef, useState } from 'react';
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
import { ADMIN_API_BASE } from '../types';

const SiteConfigUpdatePublicConfig: React.FC = () => {
  const { owner, site } = useResource();
  const [config, setConfig] = useState({
    paths: {
      mappings: [],
      includes: [],
      excludes: [],
    },
  });
  const { status, responseData, error, loading, executeSubmit, reset, requestDetails } = useFormState();
  const jsonEditorRef = useRef<any>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const details = {
      url: `${ADMIN_API_BASE}/config/${owner}/sites/${site}/public.json`,
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
        title="Update Path Mappings"
        description="Updates the site's public path mappings, includes, and excludes."
        icon={WebIcon}
        helpUrl="https://www.aem.live/developer/authoring-path-mapping"
      />

      <Paper sx={{ p: 3, mb: 3, border: 1, borderColor: 'grey.300' }}>
        <Form onSubmit={handleSubmit}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <SiteInputs />
            <JsonEditor
              ref={jsonEditorRef}
              value={config}
              onChange={setConfig}
              label="Path Mapping Configuration"
              required
              placeholder="Enter public path configuration as JSON"
              helperText="Configure paths.mappings, paths.includes, and paths.excludes."
            />
            <ApiUrlDisplay
              method="POST"
              url={`${ADMIN_API_BASE}/config/${owner || '{owner}'}/sites/${site || '{site}'}/public.json`}
            />
            <Button
              variant="contained"
              type="submit"
              disabled={loading}
              startIcon={loading ? <CircularProgress size={20} /> : null}
            >
              Update Path Mappings
            </Button>
          </Box>
        </Form>
      </Paper>

      <ErrorDisplay
        error={error}
        onDismiss={reset}
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

export default SiteConfigUpdatePublicConfig;