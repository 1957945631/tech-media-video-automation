import assert from 'node:assert/strict';
import test from 'node:test';
import {cleanAudienceText, cleanAudienceKeywords, pickAudienceBody} from './audience_copy.mjs';

const internalCopy = '用一个具体使用场景切入，再解释它为什么代表本周科技趋势。';

test('cleanAudienceText removes internal production directions from visible copy', () => {
  assert.equal(cleanAudienceText(internalCopy, 'OpenAI 企业落地'), 'OpenAI 企业落地');
  assert.equal(cleanAudienceText('用一句判断收束这一条新闻，让观众记住它和本期主线的关系。', '关键判断'), '关键判断');
  assert.equal(cleanAudienceText('用概念画面承接抽象机制，避免长时间只看网页或文字卡。', '技术机制'), '技术机制');
  assert.equal(cleanAudienceText('本期按照最终配音和 SRT 生成时间线。', '本期从真实证据和产业现场看科技变化。'), '本期从真实证据和产业现场看科技变化。');
});

test('cleanAudienceKeywords filters internal planning phrases and limits chips', () => {
  assert.deepEqual(
    cleanAudienceKeywords(['OpenAI', '用一个具体使用场景切入', 'Deployment Company', '再解释它为什么代表本周科技趋势', '企业落地'], 3),
    ['OpenAI', 'Deployment Company', '企业落地']
  );
});

test('pickAudienceBody never returns beat intent for visible card body', () => {
  const beat = {
    intent: '用一句判断收束这一条新闻，让观众记住它和本期主线的关系。',
    concept: internalCopy,
    overlayTitle: 'OpenAI 企业落地',
    subject: 'OpenAI Deployment Company'
  };

  assert.equal(pickAudienceBody({beat, segment: {body: '企业 AI 从模型调用走向部署服务。'}}), '企业 AI 从模型调用走向部署服务。');
});
