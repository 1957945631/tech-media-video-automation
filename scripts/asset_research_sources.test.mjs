import assert from 'node:assert/strict';
import test from 'node:test';
import {mergeResearchSourcesIntoPools, normalizeResearchSources} from './asset_research_sources.mjs';

test('normalizeResearchSources converts news-aggregator-skill JSON into candidate sources', () => {
  const sources = normalizeResearchSources([
    {
      source: 'GitHub Trending',
      title: 'TanStack Query',
      url: 'https://github.com/TanStack/query',
      heat: '100 stars',
      time: 'Today'
    },
    {
      source: 'Product Hunt',
      title: 'A new consumer app launch',
      url: 'https://www.producthunt.com/products/example'
    }
  ]);

  assert.equal(sources.length, 2);
  assert.equal(sources[0].category, 'product_ui');
  assert.equal(sources[0].name, 'GitHub Trending');
  assert.equal(sources[1].category, 'product_ui');
});

test('normalizeResearchSources supports keyed payloads and dedupes URLs', () => {
  const sources = normalizeResearchSources({
    github: [
      {title: 'NVIDIA GPU servers', url: 'https://www.nvidia.com/en-us/data-center/'},
      {title: 'Duplicate', url: 'https://www.nvidia.com/en-us/data-center/'}
    ]
  });

  assert.equal(sources.length, 1);
  assert.equal(sources[0].category, 'industry_broll');
});

test('mergeResearchSourcesIntoPools adds research sources to functional pools and evidence fallback', () => {
  const pools = {
    evidence_screenshot: [],
    product_ui: [],
    industry_broll: []
  };
  const merged = mergeResearchSourcesIntoPools(pools, [
    {name: 'GitHub', title: 'Repo', url: 'https://github.com/example/repo', category: 'product_ui'}
  ]);

  assert.equal(merged.product_ui.length, 1);
  assert.equal(merged.evidence_screenshot.length, 1);
  assert.equal(pools.product_ui.length, 0);
});

test('normalizeResearchSources marks direct media assets as first-class image or video sources', () => {
  const sources = normalizeResearchSources([
    {title: 'Launch demo', url: 'https://cdn.example.com/demo.mp4'},
    {title: 'Product still', url: 'https://cdn.example.com/ui.webp'}
  ]);

  assert.equal(sources[0].mediaType, 'video');
  assert.equal(sources[1].mediaType, 'image');
});
