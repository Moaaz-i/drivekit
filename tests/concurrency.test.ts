import { describe, it, expect } from 'vitest';
import { ConcurrencyPool } from '../src/core/concurrency-pool.js';

describe('ConcurrencyPool', () => {
  it('limits concurrent tasks to configured maximum', async () => {
    const concurrency = 3;
    const pool = new ConcurrencyPool(concurrency);
    let activeTasks = 0;
    let maxObservedActive = 0;

    const task = async () => {
      activeTasks++;
      maxObservedActive = Math.max(maxObservedActive, activeTasks);
      await new Promise((r) => setTimeout(r, 20));
      activeTasks--;
      return true;
    };

    const tasks = Array.from({ length: 10 }, () => () => task());
    const results = await pool.all(tasks);

    expect(results).toHaveLength(10);
    expect(maxObservedActive).toBeLessThanOrEqual(concurrency);
    expect(activeTasks).toBe(0);
  });

  it('correctly maps array items concurrently', async () => {
    const pool = new ConcurrencyPool(2);
    const items = [1, 2, 3, 4];
    const results = await pool.map(items, async (item) => item * 2);
    expect(results).toEqual([2, 4, 6, 8]);
  });
});

