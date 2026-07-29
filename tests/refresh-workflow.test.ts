import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const workflow = readFileSync(new URL('../.github/workflows/refresh.yml', import.meta.url), 'utf8');

describe('refresh workflow ordering', () => {
  it('pushes refreshed podcast data only after check, test, and build pass', () => {
    const localCommit = workflow.indexOf('name: Create local snapshot commit if it changed');
    const check = workflow.indexOf('run: npm run check');
    const test = workflow.indexOf('run: npm test');
    const build = workflow.indexOf('run: npm run build');
    const push = workflow.indexOf('run: git push origin HEAD:"$GITHUB_REF_NAME"');

    expect(localCommit).toBeGreaterThan(-1);
    expect(check).toBeGreaterThan(localCommit);
    expect(test).toBeGreaterThan(check);
    expect(build).toBeGreaterThan(test);
    expect(push).toBeGreaterThan(build);
  });
});
