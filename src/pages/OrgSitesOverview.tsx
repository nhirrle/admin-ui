import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Autocomplete,
  Box,
  Button,
  Checkbox,
  Chip,
  CircularProgress,
  FormControlLabel,
  IconButton,
  LinearProgress,
  Paper,
  Switch,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tabs,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import CompareArrowsIcon from '@mui/icons-material/CompareArrows';
import VisibilityIcon from '@mui/icons-material/Visibility';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import { useResource } from '../context/ResourceContext';
import PageHeader from '../components/PageHeader';
import ErrorDisplay from '../components/ErrorDisplay';
import SiteInputs from '../components/SiteInputs';
import { useErrorHandler } from '../hooks/useErrorHandler';
import {
  fetchSiteConfig,
  fetchSiteNames,
  flattenConfig,
  mapWithConcurrency,
  VOLATILE_KEYS,
} from '../utils/siteConfig';

interface SiteRow {
  name: string;
  config?: any;
  error?: string;
}

const headCell = { bgcolor: 'grey.100', fontWeight: 'bold', whiteSpace: 'nowrap' } as const;

const protectedAreas = (access: any): string[] =>
  ['site', 'preview', 'live'].filter((area) => {
    const allow = access?.[area]?.allow;
    return Array.isArray(allow) ? allow.length > 0 : !!allow;
  });

const OrgSitesOverview: React.FC = () => {
  const navigate = useNavigate();
  const { owner, setSite } = useResource();
  const { error, handleError, clearError } = useErrorHandler();
  const [rows, setRows] = useState<SiteRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [filter, setFilter] = useState('');
  const [selected, setSelected] = useState<string[]>([]);
  const [tab, setTab] = useState(0);
  const [onlyDiffs, setOnlyDiffs] = useState(true);

  const load = async () => {
    clearError();
    setLoading(true);
    setRows([]);
    setSelected([]);
    try {
      const names = await fetchSiteNames(owner);
      setProgress({ done: 0, total: names.length });
      const results = await mapWithConcurrency(names, 5, async (name): Promise<SiteRow> => {
        try {
          return { name, config: await fetchSiteConfig(owner, name) };
        } catch (e) {
          return { name, error: e instanceof Error ? e.message : String(e) };
        } finally {
          setProgress((p) => ({ ...p, done: p.done + 1 }));
        }
      });
      setRows(results);
    } catch (e) {
      handleError(e, 'Loading sites');
    } finally {
      setLoading(false);
    }
  };

  const filteredRows = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => r.name.toLowerCase().includes(q)
      || JSON.stringify(r.config ?? {}).toLowerCase().includes(q));
  }, [rows, filter]);

  const toggleSelected = (name: string) => setSelected((prev) => (
    prev.includes(name) ? prev.filter((n) => n !== name) : [...prev, name]
  ));

  const comparison = useMemo(() => {
    const sites = selected
      .map((name) => rows.find((r) => r.name === name))
      .filter((r): r is SiteRow => !!r?.config);
    const flats = sites.map((s) => flattenConfig(s.config));
    const keys = Array.from(new Set(flats.flatMap((f) => Object.keys(f))))
      .filter((k) => !VOLATILE_KEYS.includes(k))
      .sort();
    const lines = keys.map((key) => {
      const values = flats.map((f) => f[key]);
      return { key, values, differs: new Set(values).size > 1 };
    });
    return {
      sites,
      lines: onlyDiffs ? lines.filter((l) => l.differs) : lines,
      diffCount: lines.filter((l) => l.differs).length,
      total: lines.length,
    };
  }, [rows, selected, onlyDiffs]);

  const openSite = (name: string) => {
    setSite(name);
    navigate('/site-config/read');
  };

  const cloneSite = (name: string) => {
    setSite(name);
    navigate('/site-config/clone');
  };

  return (
    <Box>
      <PageHeader
        title="Sites Overview"
        description="Loads the configuration of every site in the organization to get an overview and compare sites side by side."
        icon={CompareArrowsIcon}
        helpUrl="https://www.aem.live/docs/admin.html#getList-Site-Config"
      />

      <Paper sx={{ p: 3, mb: 3, border: 1, borderColor: 'grey.300' }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <SiteInputs hideSite />
          <Button
            variant="contained"
            onClick={load}
            disabled={loading || !owner}
            startIcon={loading ? <CircularProgress size={20} /> : null}
          >
            Load all sites
          </Button>
          {loading && progress.total > 0 && (
            <Box>
              <LinearProgress variant="determinate" value={(progress.done / progress.total) * 100} />
              <Typography variant="caption" color="text.secondary">
                {progress.done} / {progress.total} site configs loaded
              </Typography>
            </Box>
          )}
        </Box>
      </Paper>

      <ErrorDisplay error={error} onDismiss={clearError} requestDetails={null} />

      {rows.length > 0 && (
        <Paper sx={{ border: 1, borderColor: 'grey.300' }}>
          <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ borderBottom: 1, borderColor: 'divider', px: 2 }}>
            <Tab label={`Overview (${rows.length})`} />
            <Tab label={`Compare (${selected.length})`} />
          </Tabs>

          {tab === 0 && (
            <Box sx={{ p: 2 }}>
              <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', mb: 2 }}>
                <TextField
                  size="small"
                  label="Filter"
                  placeholder="Site name or any config value"
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                  sx={{ flex: 1 }}
                />
                <Button
                  variant="outlined"
                  disabled={selected.length < 2}
                  onClick={() => setTab(1)}
                  startIcon={<CompareArrowsIcon />}
                >
                  Compare selected
                </Button>
              </Box>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell sx={headCell} padding="checkbox" />
                      <TableCell sx={headCell}>Site</TableCell>
                      <TableCell sx={headCell}>Content source</TableCell>
                      <TableCell sx={headCell}>Code</TableCell>
                      <TableCell sx={headCell}>Prod CDN</TableCell>
                      <TableCell sx={headCell}>Protected</TableCell>
                      <TableCell sx={headCell}>Last modified</TableCell>
                      <TableCell sx={headCell}>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filteredRows.map(({ name, config, error: rowError }) => (
                      <TableRow key={name} hover selected={selected.includes(name)}>
                        <TableCell padding="checkbox">
                          <Checkbox
                            size="small"
                            checked={selected.includes(name)}
                            disabled={!config}
                            onChange={() => toggleSelected(name)}
                          />
                        </TableCell>
                        <TableCell sx={{ fontWeight: 500 }}>{name}</TableCell>
                        {rowError ? (
                          <TableCell colSpan={5}>
                            <Typography variant="body2" color="error">{rowError}</Typography>
                          </TableCell>
                        ) : (
                          <>
                            <TableCell>
                              {config?.content?.source?.type && (
                                <Chip size="small" label={config.content.source.type} sx={{ mr: 1 }} />
                              )}
                              <Typography variant="body2" component="span" sx={{ wordBreak: 'break-all' }}>
                                {config?.content?.source?.url ?? '—'}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              {config?.code?.owner ? `${config.code.owner}/${config.code.repo}` : '—'}
                            </TableCell>
                            <TableCell>
                              {config?.cdn?.prod?.type && (
                                <Chip size="small" label={config.cdn.prod.type} sx={{ mr: 1 }} />
                              )}
                              {config?.cdn?.prod?.host ?? '—'}
                            </TableCell>
                            <TableCell>
                              {protectedAreas(config?.access).map((area) => (
                                <Chip key={area} size="small" color="warning" label={area} sx={{ mr: 0.5 }} />
                              ))}
                            </TableCell>
                            <TableCell sx={{ whiteSpace: 'nowrap' }}>
                              {config?.lastModified ? new Date(config.lastModified).toLocaleString() : '—'}
                            </TableCell>
                          </>
                        )}
                        <TableCell sx={{ whiteSpace: 'nowrap' }}>
                          <Tooltip title="View Site Config">
                            <IconButton size="small" onClick={() => openSite(name)}><VisibilityIcon /></IconButton>
                          </Tooltip>
                          <Tooltip title="Clone Site">
                            <IconButton size="small" onClick={() => cloneSite(name)}><ContentCopyIcon /></IconButton>
                          </Tooltip>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          )}

          {tab === 1 && (
            <Box sx={{ p: 2 }}>
              <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', mb: 2 }}>
                <Autocomplete
                  multiple
                  size="small"
                  options={rows.filter((r) => r.config).map((r) => r.name)}
                  value={selected}
                  onChange={(_, v) => setSelected(v)}
                  renderInput={(params) => <TextField {...params} label="Sites to compare (first = baseline)" />}
                  sx={{ flex: 1 }}
                />
                <FormControlLabel
                  control={<Switch checked={onlyDiffs} onChange={(e) => setOnlyDiffs(e.target.checked)} />}
                  label="Only differences"
                />
              </Box>

              {comparison.sites.length < 2 ? (
                <Typography color="text.secondary">Select at least two sites to compare.</Typography>
              ) : (
                <>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                    {comparison.diffCount} of {comparison.total} settings differ.
                  </Typography>
                  <TableContainer sx={{ maxHeight: '70vh' }}>
                    <Table size="small" stickyHeader>
                      <TableHead>
                        <TableRow>
                          <TableCell sx={headCell}>Setting</TableCell>
                          {comparison.sites.map((s, i) => (
                            <TableCell key={s.name} sx={headCell}>
                              {s.name}{i === 0 && ' (baseline)'}
                            </TableCell>
                          ))}
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {comparison.lines.map(({ key, values }) => (
                          <TableRow key={key}>
                            <TableCell sx={{ fontFamily: 'monospace', whiteSpace: 'nowrap' }}>{key}</TableCell>
                            {values.map((value, i) => (
                              <TableCell
                                key={comparison.sites[i].name}
                                sx={{
                                  fontFamily: 'monospace',
                                  wordBreak: 'break-all',
                                  bgcolor: i > 0 && value !== values[0] ? 'warning.light' : undefined,
                                  color: value === undefined ? 'text.disabled' : undefined,
                                }}
                              >
                                {value ?? '—'}
                              </TableCell>
                            ))}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </>
              )}
            </Box>
          )}
        </Paper>
      )}
    </Box>
  );
};

export default OrgSitesOverview;
