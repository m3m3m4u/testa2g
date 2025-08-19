import { runOnce } from '@/lib/runner';

jest.mock('@/lib/config', () => ({
  getConfig: () => ({
    openaiApiKey: 'sk-test',
    model: 'gpt-4o-mini',
  }),
}));

jest.mock('@/lib/ai', () => ({
  AIClient: class FakeAI {
    async answer(q: string) { return `FAKE_EVAL: ${q.slice(0, 30)}...`; }
  },
}));

describe('runOnce', () => {
  it('evaluates inputs and saves to data', async () => {
    const inputs = [
      { question: 'Was ist X?', answer: 'X ist ...' },
      { question: 'Wie geht Y?', answer: 'Mit Z.' },
    ];
    const res = await runOnce(inputs);
    expect(res.processed).toBe(2);
    expect(res.saved).toBe(2);
    expect(res.errors.length).toBe(0);
  });
});
