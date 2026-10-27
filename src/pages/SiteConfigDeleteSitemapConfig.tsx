import React, { useState } from 'react';
import { Box, Paper, Button, CircularProgress } from '@mui/material';
import WebIcon from '@mui/icons-material/Web';
import { useResource } from '../context/ResourceContext';
import ApiUrlDisplay from '../components/ApiUrlDisplay';
import ConfirmDialog from '../components/ConfirmDialog';
import ErrorDisplay from '../components/ErrorDisplay';
import PageHeader from '../components/PageHeader';
import Form, { useFormState } from '../components/Form';
import ResponseDisplay from '../components/response/ResponseDisplay';
import SiteInputs from '../components/SiteInputs';
import { yamlConfigUrl } from '../utils/siteConfig';

const SiteConfigDeleteSitemapConfig: React.FC = () => {
  const { owner, site } = useResource();
  const { status, responseData, error, loading, executeSubmit, reset, requestDetails } = useFormState();
  const [confirmOpen, setConfirmOpen] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setConfirmOpen(true);
  };

  const handleConfirm = () => {
    setConfirmOpen(false);
    executeSubmit({
      url: yamlConfigUrl(owner, site, 'sitemap.yaml'),
      method: 'DELETE',
      headers: {},
      queryParams: {},
      body: null
    });
  };

  return (
    <Box>
      <PageHeader
        title="Delete Sitemap Config"
        description="Deletes the sitemap configuration (content/sitemap.yaml) of the site."
        helpUrl="https://www.aem.live/developer/sitemap"
        icon={WebIcon}
      />

      <Paper sx={{ p: 3, mb: 3, border: 1, borderColor: 'grey.300' }}>
        <Form onSubmit={handleSubmit}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <SiteInputs />
            <ApiUrlDisplay
              method="DELETE"
              url={yamlConfigUrl(owner || '{owner}', site || '{site}', 'sitemap.yaml')}
            />
            <Button
              variant="contained"
              color="error"
              type="submit"
              disabled={loading}
              startIcon={loading ? <CircularProgress size={20} /> : null}
            >
              Delete Sitemap Config
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

      <ConfirmDialog
        open={confirmOpen}
        title="Confirm Delete"
        message={`Are you sure you want to delete the sitemap configuration for site "${site}"? This action cannot be undone.`}
        confirmLabel="Delete"
        onConfirm={handleConfirm}
        onCancel={() => setConfirmOpen(false)}
      />
    </Box>
  );
};

export default SiteConfigDeleteSitemapConfig;
