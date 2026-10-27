import React from 'react';
import { Box, Paper, Button, CircularProgress } from '@mui/material';
import WebIcon from '@mui/icons-material/Web';
import { useResource } from '../context/ResourceContext';
import ApiUrlDisplay from './ApiUrlDisplay';
import ErrorDisplay from './ErrorDisplay';
import PageHeader from './PageHeader';
import Form, { useFormState } from './Form';
import SiteInputs from './SiteInputs';
import YamlConfigDisplay from './response/YamlConfigDisplay';
import { YamlConfigFile, yamlConfigUrl } from '../utils/siteConfig';

interface YamlConfigReadPageProps {
  title: string;
  description: string;
  helpUrl: string;
  file: YamlConfigFile;
  editPath: string;
  buttonLabel: string;
}

const YamlConfigReadPage: React.FC<YamlConfigReadPageProps> = ({
  title,
  description,
  helpUrl,
  file,
  editPath,
  buttonLabel,
}) => {
  const { owner, site } = useResource();
  const { status, responseData, error, loading, executeSubmit, reset, requestDetails } = useFormState();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    executeSubmit({
      url: yamlConfigUrl(owner, site, file),
      method: 'GET',
      headers: {},
      queryParams: {},
      body: null
    });
  };

  return (
    <Box>
      <PageHeader
        title={title}
        description={description}
        helpUrl={helpUrl}
        icon={WebIcon}
      />

      <Paper sx={{ p: 3, mb: 3, border: 1, borderColor: 'grey.300' }}>
        <Form onSubmit={handleSubmit}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <SiteInputs />
            <ApiUrlDisplay
              method="GET"
              url={yamlConfigUrl(owner || '{owner}', site || '{site}', file)}
            />
            <Button
              variant="contained"
              type="submit"
              disabled={loading}
              startIcon={loading ? <CircularProgress size={20} /> : null}
            >
              {buttonLabel}
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
        <YamlConfigDisplay
          requestDetails={requestDetails}
          responseData={responseData}
          responseStatus={status}
          editPath={editPath}
          editTitle={`Edit ${file}`}
        />
      )}
    </Box>
  );
};

export default YamlConfigReadPage;
