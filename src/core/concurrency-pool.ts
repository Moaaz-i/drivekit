/**
 * Lightweight asynchronous worker pool for concurrent operations
 */
export class ConcurrencyPool {
  private concurrency: number;
  private running = 0;
  private queue: (() => Promise<void>)[] = [];

  constructor(concurrency = 4) {
    this.concurrency = Math.max(1, concurrency);
  }

  /**
   * Run a task when a slot becomes available
   */
  async run<T>(task: () => Promise<T>): Promise<T> {
    if (this.running >= this.concurrency) {
      await new Promise<void>((resolve) => {
        this.queue.push(async () => {
          resolve();
        });
      });
    }

    this.running++;
    try {
      return await task();
    } finally {
      this.running--;
      if (this.queue.length > 0) {
        const next = this.queue.shift();
        if (next) next();
      }
    }
  }

  /**
   * Run all tasks in parallel bounded by concurrency limit
   */
  async all<T>(tasks: (() => Promise<T>)[]): Promise<T[]> {
    return Promise.all(tasks.map((task) => this.run(task)));
  }

  /**
   * Execute an array of items concurrently through an async mapper
   */
  async map<Item, Result>(
    items: Item[],
    fn: (item: Item, index: number) => Promise<Result>
  ): Promise<Result[]> {
    return Promise.all(items.map((item, index) => this.run(() => fn(item, index))));
  }
}

