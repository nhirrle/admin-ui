import React from 'react';
import { Box, Paper, IconButton, Tooltip } from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import { useNavigate } from 'react-router-dom';
import ResponseLayout from './ResponseLayout';
import { RequestDetails } from '../../types';

interface YamlConfigDisplayProps {
  requestDetails: RequestDetails | null;
  responseData: unknown;
  responseStatus: number;
  editPath?: string;
  editTitle?: string;
}

const YamlConfigDisplay: React.FC<YamlConfigDisplayProps> = ({
  requestDetails,
  responseData,
  responseStatus,
  editPath,
  editTitle = 'Edit',
}) => {
  const navigate = useNavigate();
  const content = typeof responseData === 'string' ? responseData : '';

  const toolbar = editPath ? (
    <Box sx={{ display: 'flex', gap: 1 }}>
      <Tooltip title={editTitle}>
        <IconButton onClick={() => navigate(editPath)} size="small"><EditIcon /></IconButton>
      </Tooltip>
    </Box>
  ) : undefined;

  return (
    <ResponseLayout
      requestDetails={requestDetails}
      responseData={responseData}
      responseStatus={responseStatus}
      toolbar={toolbar}
    >
      <Paper sx={{ p: 3, mb: 3, border: 1, borderColor: 'grey.300' }}>
        <Box sx={{
          fontFamily: 'monospace',
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
          '& .key': { color: '#2196f3', fontWeight: 'bold' },
          '& .comment': { color: '#757575', fontStyle: 'italic' },
        }}>
          {content.split('\n').map((line, index) => {
            if (!line.trim()) return <br key={index} />;
            if (line.trim().startsWith('#')) return <div key={index} className="comment">{line}</div>;
            const match = /^(\s*(?:- )?[^:#]+?:)(.*)$/.exec(line);
            if (!match) return <div key={index}>{line}</div>;
            return (
              <div key={index}>
                <span className="key">{match[1]}</span>
                {match[2]}
              </div>
            );
          })}
        </Box>
      </Paper>
    </ResponseLayout>
  );
};

export default YamlConfigDisplay;
