import React from 'react';
import { Box, TextField, Autocomplete } from '@mui/material';
import { useResource } from '../context/ResourceContext';

interface ResourceInputsProps {
  defaultOwner?: string;
  defaultSite?: string;
  defaultRef?: string;
  defaultPath?: string;
  readOnlyOwner?: boolean;
  readOnlySite?: boolean;
  readOnlyRef?: boolean;
  readOnlyPath?: boolean;
  hidePath?: boolean;
  pathHelperText?: string;
}

const ResourceInputs: React.FC<ResourceInputsProps> = ({
  defaultOwner = '',
  defaultSite = '',
  defaultRef = '',
  defaultPath = '',
  readOnlyOwner = false,
  readOnlySite = false,
  readOnlyRef = false,
  readOnlyPath = false,
  hidePath = false,
  pathHelperText = 'Relative path of the resource',
}) => {
  const {
    owner, setOwner,
    site, setSite,
    ref, setRef,
    path, setPath,
    ownerHistory,
    siteHistory,
    refHistory,
    pathHistory
  } = useResource();

  React.useEffect(() => {
    if (defaultOwner) setOwner(defaultOwner);
    if (defaultSite) setSite(defaultSite);
    if (defaultRef) setRef(defaultRef);
    if (defaultPath) setPath(defaultPath);
  }, [defaultOwner, defaultSite, defaultRef, defaultPath]);

  return (
    <Box sx={{
      display: 'flex',
      flexDirection: { xs: 'column', md: 'row' },
      gap: 2
    }}>
      <Box sx={{ flex: 1 }}>
        <Autocomplete
          freeSolo
          options={ownerHistory}
          value={owner}
          onChange={(_, newValue) => setOwner(newValue || '')}
          renderInput={(params) => (
            <TextField
              {...params}
              fullWidth
              label="Organization"
              required
              onChange={(e) => setOwner(e.target.value)}
              placeholder="Organization name"
              helperText="Organization or GitHub owner"
              InputProps={{ ...params.InputProps, readOnly: readOnlyOwner }}
            />
          )}
        />
      </Box>

      <Box sx={{ flex: 1 }}>
        <Autocomplete
          freeSolo
          options={siteHistory}
          value={site}
          onChange={(_, newValue) => setSite(newValue || '')}
          renderInput={(params) => (
            <TextField
              {...params}
              fullWidth
              label="Site"
              required
              onChange={(e) => setSite(e.target.value)}
              placeholder="Site name"
              helperText="Site (repository) name"
              InputProps={{ ...params.InputProps, readOnly: readOnlySite }}
            />
          )}
        />
      </Box>

      <Box sx={{ flex: 1 }}>
        <Autocomplete
          freeSolo
          options={refHistory}
          value={ref}
          onChange={(_, newValue) => setRef(newValue || '')}
          renderInput={(params) => (
            <TextField
              {...params}
              fullWidth
              label="Reference"
              required
              onChange={(e) => setRef(e.target.value)}
              placeholder="Branch or ref"
              helperText="Branch reference (e.g., main)"
              InputProps={{ ...params.InputProps, readOnly: readOnlyRef }}
            />
          )}
        />
      </Box>

      {!hidePath && (
        <Box sx={{ flex: 1 }}>
          <Autocomplete
            freeSolo
            options={pathHistory}
            value={path}
            onChange={(_, newValue) => setPath(newValue || '')}
            renderInput={(params) => (
              <TextField
                {...params}
                fullWidth
                label="Path"
                required
                onChange={(e) => setPath(e.target.value)}
                placeholder="Resource path"
                helperText={pathHelperText}
                InputProps={{ ...params.InputProps, readOnly: readOnlyPath }}
              />
            )}
          />
        </Box>
      )}
    </Box>
  );
};

export default ResourceInputs;
