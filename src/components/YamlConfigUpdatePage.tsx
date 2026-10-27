import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Alert,
  Box,
  Paper,
  Button,
  CircularProgress,
  TextField,
} from '@mui/material';
import WebIcon from '@mui/icons-material/Web';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import { useResource } from '../context/ResourceContext';
import ApiUrlDisplay from './ApiUrlDisplay';
import ConfirmDialog from './ConfirmDialog';
import ErrorDisplay from './ErrorDisplay';
import PageHeader from './PageHeader';
import Form, { useFormState } from './Form';
import SiteInputs from './SiteInputs';
import ResponseDisplay from './response/ResponseDisplay';
import { apiCall } from '../utils/api';
import { ApiError } from '../utils/errorUtils';
import { YamlConfigFile, yamlConfigUrl, validateYaml } from '../utils/siteConfig';
import { useErrorHandler } from '../hooks/useErrorHandler';

interface YamlConfigUpdatePageProps {
  title: string;
  description: string;
  helpUrl: string;
  file: YamlConfigFile;
  hint: React.ReactNode;
  buttonLabel: string;
}

const YamlConfigUpdatePage: React.FC<YamlConfigUpdatePageProps> = ({
  title,
  description,
  helpUrl,
  file,
  hint,
  buttonLabel,
}) => {
  const { owner, site } = useResource();
  const [content, setContent] = useState('');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const { status, responseData, error, loading, executeSubmit, reset, requestDetails } = useFormState();
  const { error: textError, handleError, clearError } = useErrorHandler();

  const parseError = useMemo(() => (content.trim() ? validateYaml(content) : null), [content]);

  // Prefill with the current config; a 404 just means none exists yet.
  useEffect(() => {
    if (!owner || !site) return undefined;
    let cancelled = false;
    apiCall({
      url: yamlConfigUrl(owner, site, file),
      method: 'GET',
      headers: {},
      queryParams: {},
      body: null,
    })
      .then(({ status: s, responseData: data }) => {
        if (!cancelled && s === 200 && typeof data === 'string') setContent(data);
      })
      .catch((err) => {
        if (cancelled || (err instanceof ApiError && err.status === 404)) return;
        handleError(err, `Error fetching ${file}`);
      });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [owner, site, file]);

  const send = async () => {
    setConfirmOpen(false);
    clearError();
    await executeSubmit({
      url: yamlConfigUrl(owner, site, file),
      method: 'POST',
      headers: {
        'content-type': 'text/yaml',
      },
      queryParams: {},
      body: content
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (parseError) {
      setConfirmOpen(true);
      return;
    }
    await send();
  };

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    e.target.value = '';
    if (!selected) return;
    setContent(await selected.text());
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
            <Alert severity="info">{hint}</Alert>
            <Box>
              <input
                ref={fileInput}
                type="file"
                accept=".yaml,.yml"
                hidden
                onChange={handleFile}
              />
              <Button
                variant="outlined"
                size="small"
                startIcon={<UploadFileIcon />}
                onClick={() => fileInput.current?.click()}
              >
                Load from file
              </Button>
            </Box>
            <TextField
              multiline
              minRows={12}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              label={`${file} Content`}
              required
              placeholder={`Enter ${file} content`}
              error={!!parseError}
              helperText={parseError ? `YAML syntax error: ${parseError}` : 'YAML content, sent as text/yaml'}
              sx={{
                '& .MuiInputBase-root': {
                  fontFamily: 'monospace',
                },
                '& .MuiFormHelperText-root': {
                  whiteSpace: 'pre-wrap',
                  fontFamily: parseError ? 'monospace' : undefined,
                },
              }}
            />
            <ApiUrlDisplay
              method="POST"
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
        error={error || textError}
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

      <ConfirmDialog
        open={confirmOpen}
        title="Invalid YAML"
        message={`The content is not valid YAML (${parseError?.split('\n')[0] ?? ''}). Send it anyway?`}
        confirmLabel="Send anyway"
        onConfirm={send}
        onCancel={() => setConfirmOpen(false)}
      />
    </Box>
  );
};

export default YamlConfigUpdatePage;
