import React from 'react';
import YamlConfigReadPage from '../components/YamlConfigReadPage';

const SiteConfigReadSitemapConfig: React.FC = () => (
  <YamlConfigReadPage
    title="Read Sitemap Config"
    description="Returns the sitemap configuration (content/sitemap.yaml) of the site. A 404 means no sitemap is configured."
    helpUrl="https://www.aem.live/developer/sitemap"
    file="sitemap.yaml"
    editPath="/site-config/update-sitemap"
    buttonLabel="Read Sitemap Config"
  />
);

export default SiteConfigReadSitemapConfig;
