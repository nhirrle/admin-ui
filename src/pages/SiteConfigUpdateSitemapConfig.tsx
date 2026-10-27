import React from 'react';
import YamlConfigUpdatePage from '../components/YamlConfigUpdatePage';

const SiteConfigUpdateSitemapConfig: React.FC = () => (
  <YamlConfigUpdatePage
    title="Update Sitemap Config"
    description="Creates or replaces the sitemap configuration (content/sitemap.yaml) of the site."
    helpUrl="https://www.aem.live/developer/sitemap"
    file="sitemap.yaml"
    hint={
      <>
        The file defines <code>sitemaps:</code> (source index, destination, hreflang, alternate) and{' '}
        <code>index:</code>. After saving, use "Generate Sitemap" to build the sitemap files.
      </>
    }
    buttonLabel="Update Sitemap Config"
  />
);

export default SiteConfigUpdateSitemapConfig;
