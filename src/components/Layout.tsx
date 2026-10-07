import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Drawer, 
  AppBar,
  Toolbar,
  List, 
  Typography, 
  Divider, 
  IconButton, 
  ListItemButton,
  ListItem, 
  ListItemIcon, 
  ListItemText,
  useTheme,
  useMediaQuery,
  Tooltip,
  Chip,
  Button,
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import SettingsIcon from '@mui/icons-material/Settings';
import PreviewIcon from '@mui/icons-material/Preview';
import CodeIcon from '@mui/icons-material/Code';
import CachedIcon from '@mui/icons-material/Cached';
import SearchIcon from '@mui/icons-material/Search';
import MapIcon from '@mui/icons-material/Map';
import DescriptionIcon from '@mui/icons-material/Description';
import WorkIcon from '@mui/icons-material/Work';
import BusinessIcon from '@mui/icons-material/Business';
import WebIcon from '@mui/icons-material/Web';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import TuneIcon from '@mui/icons-material/Tune';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import TokenInputModal from './TokenInputModal';
import adobeLogo from '../adobelogo.png';

const drawerWidth = 280;

interface SubMenuItem {
  text: string;
  path: string;
  method: string;
}

interface MenuItem {
  text: string;
  icon: React.ReactElement;
  path?: string;
  method?: string;
  subItems?: SubMenuItem[];
}

interface MenuGroup {
  items: MenuItem[];
}

interface LayoutProps {
  children: React.ReactNode;
}

const menuGroups: MenuGroup[] = [
  {
    items: [
      {
        text: 'Status',
        icon: <CheckCircleIcon />,
        subItems: [
          { text: 'General Status', path: '/status/general', method: 'GET' },
          { text: 'Bulk Status Job', path: '/status/bulk', method: 'POST' }
        ]
      },
      {
        text: 'Preview',
        icon: <PreviewIcon />,
        subItems: [
          { text: 'Preview Status', path: '/preview/status', method: 'GET' },
          { text: 'Update Preview', path: '/preview/update', method: 'POST' },
          { text: 'Delete Preview', path: '/preview/delete', method: 'DELETE' },
          { text: 'Bulk Preview Job', path: '/preview/bulk', method: 'POST' }
        ]
      },
      {
        text: 'Publish',
        icon: <CloudUploadIcon />,
        subItems: [
          { text: 'Publish Status', path: '/publish/status', method: 'GET' },
          { text: 'Publish Resource', path: '/publish/resource', method: 'POST' },
          { text: 'Un-publish Resource', path: '/publish/unpublish', method: 'DELETE' },
          { text: 'Bulk Publish Job', path: '/publish/bulk', method: 'POST' }
        ]
      },
      {
        text: 'Code',
        icon: <CodeIcon />,
        subItems: [
          { text: 'Code Status', path: '/code/status', method: 'GET' },
          { text: 'Update Code', path: '/code/update', method: 'POST' },
          { text: 'Delete Code', path: '/code/delete', method: 'DELETE' },
        ]
      },
      {
        text: 'Cache',
        icon: <CachedIcon />,
        subItems: [
          { text: 'Purge Live Cache', path: '/cache/purge', method: 'POST' }
        ]
      },
      {
        text: 'Index',
        icon: <SearchIcon />,
        subItems: [
          { text: 'Index Status', path: '/index/status', method: 'GET' },
          { text: 'Re-index Resource', path: '/index/reindex', method: 'POST' },
          { text: 'Remove from Index', path: '/index/remove', method: 'DELETE' }
        ]
      },
      {
        text: 'Sitemap',
        icon: <MapIcon />,
        subItems: [
          { text: 'Generate Sitemap', path: '/sitemap/generate', method: 'POST' }
        ]
      },
      {
        text: 'Logs',
        icon: <DescriptionIcon />,
        subItems: [
          { text: 'Get Logs', path: '/logs/get', method: 'GET' },
        ]
      },
      {
        text: 'Jobs',
        icon: <WorkIcon />,
        subItems: [
          { text: 'Job List', path: '/jobs/list', method: 'GET' },
          { text: 'Job Status', path: '/jobs/status', method: 'GET' },
          { text: 'Stop Job', path: '/jobs/stop', method: 'DELETE' },
          { text: 'Job Details', path: '/jobs/details', method: 'GET' }
        ]
      },
      {
        text: 'Org Config',
        icon: <BusinessIcon />,
        subItems: [
          { text: 'Read Org Config', path: '/org-config/read', method: 'GET' },
          { text: 'List Users', path: '/org-config/users', method: 'GET' },
          { text: 'Sites Overview & Compare', path: '/org-config/sites-overview', method: 'GET' },
        ]
      },
      {
        text: 'Site Config',
        icon: <WebIcon />,
        subItems: [
          { text: 'List Sites', path: '/site-config/list', method: 'GET' },
          { text: 'Read Site Config', path: '/site-config/read', method: 'GET' },
          { text: 'Read Aggregated Site Config', path: '/site-config/read-aggregated', method: 'GET' },
          { text: 'Update Site Config', path: '/site-config/update', method: 'POST' },
          { text: 'Update Path Mappings', path: '/site-config/update-path-mappings', method: 'POST' },
          { text: 'Update CDN Config', path: '/site-config/update-cdn', method: 'POST' },
          { text: 'Content Fragment Overlay', path: '/site-config/content-fragment-overlay', method: 'POST' },
          { text: 'Create Site Config', path: '/site-config/create', method: 'PUT' },
          { text: 'Clone Site', path: '/site-config/clone', method: 'PUT' },
          { text: 'Delete Site Config', path: '/site-config/delete', method: 'DELETE' },
          { text: 'Read Robots.txt', path: '/site-config/read-robots-txt', method: 'GET' },
          { text: 'Update Robots.txt', path: '/site-config/update-robots-txt', method: 'POST' },
          { text: 'List Site API Keys', path: '/site-config/list-api-keys', method: 'GET' },
          { text: 'Create Site API Key', path: '/site-config/create-api-key', method: 'POST' },
          { text: 'Delete Site API Key', path: '/site-config/delete-api-key', method: 'DELETE' },
        ]
      },
      {
        text: 'Profile Config',
        icon: <TuneIcon />,
        subItems: [
          { text: 'List Profiles', path: '/profile-config/list', method: 'GET' },
          { text: 'Create Profile', path: '/profile-config/create', method: 'PUT' },
          { text: 'Read Profile', path: '/profile-config/read', method: 'GET' },
          { text: 'Update Profile', path: '/profile-config/update', method: 'POST' },
          { text: 'Delete Profile', path: '/profile-config/delete', method: 'DELETE' },
        ]
      },
    ]
  }
];

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [expandedSubMenus, setExpandedSubMenus] = useState<string[]>([]);
  const [showTokenModal, setShowTokenModal] = useState(false);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated } = useAuth();

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleSubMenuToggle = (menuTitle: string) => {
    setExpandedSubMenus(prev =>
      prev.includes(menuTitle)
        ? prev.filter(title => title !== menuTitle)
        : [...prev, menuTitle]
    );
  };

  const handleSettingsClick = () => {
    setShowTokenModal(true);
  };

  const handleTokenModalClose = () => {
    setShowTokenModal(false);
  };

  const isActivePath = (path?: string) => {
    if (!path) return false;
    return location.pathname === path;
  };

  // Automatically expand parent menu when a sub-item is active
  useEffect(() => {
    menuGroups[0].items.forEach((item) => {
      if (item.subItems?.some(subItem => isActivePath(subItem.path))) {
        setExpandedSubMenus(prev => 
          prev.includes(item.text) ? prev : [...prev, item.text]
        );
      }
    });
  }, [location.pathname]);

  const drawer = (
    <div>
      <Toolbar>
        <IconButton
          color="inherit"
          aria-label="open drawer"
          edge="start"
          onClick={handleDrawerToggle}
          sx={{ display: { md: 'none' } }}
        >
          <MenuIcon />
        </IconButton>
      </Toolbar>
      <Divider />
      <List sx={{ py: 0 }}>
        {menuGroups[0].items.map((item) => (
          <React.Fragment key={item.text}>
            {item.subItems ? (
              <>
                <ListItem disablePadding>
                  <ListItemButton
                    onClick={() => handleSubMenuToggle(item.text)}
                    sx={{
                      px: 0,
                      '& .MuiListItemIcon-root': {
                        minWidth: '40px',
                        ml: 4,
                      },
                      '& .MuiListItemText-root': {
                        mr: 0,
                        pr: 0.5,
                      },
                      '& .MuiSvgIcon-root': {
                        mr: 2,
                      },
                    }}
                  >
                    <ListItemIcon>{item.icon}</ListItemIcon>
                    <ListItemText primary={item.text} />
                    <ExpandMoreIcon
                      sx={{
                        transform: expandedSubMenus.includes(item.text) ? 'rotate(180deg)' : 'none',
                        transition: 'transform 0.2s',
                      }}
                    />
                  </ListItemButton>
                </ListItem>
                {expandedSubMenus.includes(item.text) && (
                  <List sx={{ pl: 4 }}>
                    {item.subItems.map((subItem) => (
                      <ListItem key={subItem.text} disablePadding>
                        <ListItemButton
                          onClick={() => {
                            if (subItem.path) {
                              navigate(subItem.path);
                            }
                            if (isMobile) {
                              setMobileOpen(false);
                            }
                          }}
                          sx={{
                            px: 0,
                            pl: 2,
                            backgroundColor: isActivePath(subItem.path) ? 'rgba(25, 118, 210, 0.08)' : 'transparent',
                            '&:hover': {
                              backgroundColor: isActivePath(subItem.path) 
                                ? 'rgba(25, 118, 210, 0.12)' 
                                : 'rgba(0, 0, 0, 0.04)',
                            },
                          }}
                        >
                          <Tooltip title={subItem.method}>
                            <Chip
                              label={subItem.method === 'DELETE' ? 'DEL' : subItem.method}
                              size="small"
                              sx={{
                                mr: 1,
                                height: '18px',
                                width: '48px',
                                borderRadius: '4px',
                                '& .MuiChip-label': {
                                  px: 1,
                                  fontSize: '0.7rem',
                                  fontWeight: 600,
                                  color: 'white',
                                  width: '100%',
                                  textAlign: 'center'
                                },
                                backgroundColor: subItem.method === 'GET' ? 'success.main' :
                                  subItem.method === 'POST' ? 'primary.main' :
                                  subItem.method === 'DELETE' ? 'error.main' :
                                  'warning.main',
                              }}
                            />
                          </Tooltip>
                          <ListItemText 
                            primary={subItem.text}
                            sx={{
                              color: isActivePath(subItem.path) ? 'primary.main' : 'inherit',
                              fontWeight: isActivePath(subItem.path) ? 600 : 400,
                            }}
                          />
                        </ListItemButton>
                      </ListItem>
                    ))}
                  </List>
                )}
              </>
            ) : (
              <ListItem key={item.text} disablePadding>
                <ListItemButton
                  onClick={() => {
                    if (item.path) {
                      navigate(item.path);
                    }
                    if (isMobile) {
                      setMobileOpen(false);
                    }
                  }}
                  sx={{
                    px: 0,
                    '& .MuiListItemIcon-root': {
                      minWidth: '40px',
                      ml: 4,
                    },
                    '& .MuiListItemText-root': {
                      mr: 0,
                      pr: 0.5,
                    },
                    backgroundColor: item.path ? (isActivePath(item.path) ? 'rgba(25, 118, 210, 0.08)' : 'transparent') : 'transparent',
                    '&:hover': {
                      backgroundColor: item.path 
                        ? (isActivePath(item.path) ? 'rgba(25, 118, 210, 0.12)' : 'rgba(0, 0, 0, 0.04)')
                        : 'rgba(0, 0, 0, 0.04)',
                    },
                  }}
                >
                  <ListItemIcon>{item.icon}</ListItemIcon>
                  <ListItemText 
                    primary={item.text}
                    sx={{
                      color: item.path ? (isActivePath(item.path) ? 'primary.main' : 'inherit') : 'inherit',
                      fontWeight: item.path ? (isActivePath(item.path) ? 600 : 400) : 400,
                    }}
                  />
                </ListItemButton>
              </ListItem>
            )}
          </React.Fragment>
        ))}
      </List>
    </div>
  );

  return (
    <Box sx={{ 
      display: 'flex', 
      minHeight: '100vh',
      '& ::-webkit-scrollbar': {
        width: '8px',
        height: '8px',
      },
      '& ::-webkit-scrollbar-track': {
        background: 'transparent',
      },
      '& ::-webkit-scrollbar-thumb': {
        background: 'rgba(0, 0, 0, 0.2)',
        borderRadius: '4px',
        '&:hover': {
          background: 'rgba(0, 0, 0, 0.3)',
        },
      },
      '& ::-webkit-scrollbar-corner': {
        background: 'transparent',
      },
    }}>
      <AppBar
        position="fixed"
        sx={{
          width: '100%',
          zIndex: (theme) => theme.zIndex.drawer + 1,
        }}
      >
        <Toolbar>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2, display: { md: 'none' } }}
          >
            <MenuIcon />
          </IconButton>
          <Box sx={{ display: 'flex', alignItems: 'center', flexGrow: 1 }}>
            <img 
              src={adobeLogo} 
              alt="Adobe Logo" 
              style={{ 
                height: '32px', 
                marginRight: '12px',
                filter: 'brightness(0) invert(1)' // Makes the logo white
              }} 
            />
            <Typography variant="h6" noWrap component="div">
              AEM Admin API Dashboard
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box sx={{
              width: 8, height: 8, borderRadius: '50%',
              bgcolor: isAuthenticated ? 'success.light' : 'warning.light',
            }} />
            <Button
              color="inherit"
              startIcon={<SettingsIcon />}
              onClick={handleSettingsClick}
            >
              Settings
            </Button>
          </Box>
        </Toolbar>
      </AppBar>
      <Box
        component="nav"
        sx={{ 
          width: { md: drawerWidth }, 
          flexShrink: { md: 0 },
          '& .MuiDrawer-paper': {
            '&::-webkit-scrollbar': {
              width: '8px',
            },
            '&::-webkit-scrollbar-track': {
              background: 'transparent',
            },
            '&::-webkit-scrollbar-thumb': {
              background: 'rgba(0, 0, 0, 0.2)',
              borderRadius: '4px',
              '&:hover': {
                background: 'rgba(0, 0, 0, 0.3)',
              },
            },
          },
        }}
      >
        {isMobile ? (
          <Drawer
            variant="temporary"
            open={mobileOpen}
            onClose={handleDrawerToggle}
            ModalProps={{
              keepMounted: true, // Better open performance on mobile.
            }}
            sx={{
              display: { xs: 'block', md: 'none' },
              '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
            }}
          >
            {drawer}
          </Drawer>
        ) : (
          <Drawer
            variant="permanent"
            sx={{
              display: { xs: 'none', md: 'block' },
              '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
            }}
            open
          >
            {drawer}
          </Drawer>
        )}
      </Box>
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          width: { md: `calc(100% - ${drawerWidth}px)` },
          mt: '64px'
        }}
      >
        {children}
      </Box>
      <TokenInputModal
        open={showTokenModal}
        onClose={handleTokenModalClose}
      />
    </Box>
  );
};

export default Layout; 