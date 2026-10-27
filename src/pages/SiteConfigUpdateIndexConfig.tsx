import React from 'react';
import YamlConfigUpdatePage from '../components/YamlConfigUpdatePage';

const SiteConfigUpdateIndexConfig: React.FC = () => (
  <YamlConfigUpdatePage
    title="Update Indexing Config"
    description="Creates or replaces the indexing configuration (content/query.yaml) of the site."
    helpUrl="https://www.aem.live/docs/indexing-reference"
    file="query.yaml"
    hint={
      <>
        The file defines the indices (<code>indices:</code>) with their <code>include</code>/<code>exclude</code>{' '}
        paths, <code>target</code> and <code>properties</code>. After saving, use "Reindex" to rebuild an index.
      </>
    }
    buttonLabel="Update Indexing Config"
  />
);

export default SiteConfigUpdateIndexConfig;
