import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  Paper,
  IconButton
} from '@mui/material';
import VisibilityIcon from '@mui/icons-material/Visibility';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import ResponseLayout from './ResponseLayout';
import { useResource } from '../../context/ResourceContext';
import { RequestDetails } from '../../types';

interface Site {
  name: string;
}

interface SiteListSitesDisplayProps {
  responseData: { sites: Site[] } | null;
  requestDetails: RequestDetails | null;
  responseStatus: number;
}

const SiteListSitesDisplay: React.FC<SiteListSitesDisplayProps> = ({
  responseData,
  requestDetails,
  responseStatus,
}) => {
  const navigate = useNavigate();
  const { setSite } = useResource();

  const handleViewConfig = (siteName: string) => {
    setSite(siteName);
    navigate('/site-config/read');
  };

  const handleEditConfig = (siteName: string) => {
    setSite(siteName);
    navigate('/site-config/update');
  };

  const handleDeleteConfig = (siteName: string) => {
    setSite(siteName);
    navigate('/site-config/delete');
  };

  const handleCopyConfig = (siteName: string) => {
    setSite(siteName);
    navigate('/site-config/clone');
  };

  const sites = responseData?.sites || [];
  const sortedSites = [...sites].sort((a, b) => a.name.localeCompare(b.name));

  return (
    <ResponseLayout
      requestDetails={requestDetails}
      responseData={responseData}
      responseStatus={responseStatus}
      showToggle={sortedSites.length > 0}
    >
      {sortedSites.length === 0 ? (
        <Typography variant="body1" color="text.secondary" sx={{ mt: 2 }}>
          No sites found for this organization.
        </Typography>
      ) : (
        <TableContainer component={Paper} sx={{ mt: 2, border: 1, borderColor: 'grey.300' }}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell sx={{ bgcolor: 'grey.100', fontWeight: 'bold' }}>Actions</TableCell>
                <TableCell sx={{ bgcolor: 'grey.100', fontWeight: 'bold' }}>Site Name</TableCell>
                <TableCell sx={{ bgcolor: 'grey.100', fontWeight: 'bold' }}>Config Path</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {sortedSites.map((site) => (
                <TableRow key={site.name}>
                  <TableCell>
                    <IconButton size="small" onClick={() => handleDeleteConfig(site.name)} title="Delete Site Config">
                      <DeleteIcon />
                    </IconButton>
                    <IconButton size="small" onClick={() => handleViewConfig(site.name)} title="View Site Config">
                      <VisibilityIcon />
                    </IconButton>
                    <IconButton size="small" onClick={() => handleEditConfig(site.name)} title="Edit Site Config">
                      <EditIcon />
                    </IconButton>
                    <IconButton size="small" onClick={() => handleCopyConfig(site.name)} title="Clone Site">
                      <ContentCopyIcon />
                    </IconButton>
                  </TableCell>
                  <TableCell>{site.name}</TableCell>
                  <TableCell>{`/config/${site.name}.json`}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </ResponseLayout>
  );
};

export default SiteListSitesDisplay;
