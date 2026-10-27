import React from 'react';
import YamlConfigReadPage from '../components/YamlConfigReadPage';

const SiteConfigReadIndexConfig: React.FC = () => (
  <YamlConfigReadPage
    title="Read Indexing Config"
    description="Returns the indexing configuration (content/query.yaml) of the site. A 404 means no indexing is configured."
    helpUrl="https://www.aem.live/docs/indexing-reference"
    file="query.yaml"
    editPath="/site-config/update-index"
    buttonLabel="Read Indexing Config"
  />
);

export default SiteConfigReadIndexConfig;
