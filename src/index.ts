import 'core-js/proposals/explicit-resource-management';

import { EventEmitter } from 'node:events';
import { setImmediate } from 'node:timers/promises';

export class AsyncQueueHandler implements Disposable {
    private _emitter: AsyncEmitter = new AsyncEmitter();

    handle<T>(cb: (item: T) => void): (item: T) => boolean {
        // Use a unique event name for every listener.
        const eventName = Symbol();

        this._emitter.on(eventName, cb);

        return (item: T) => this._emitter.emit(eventName, item);
    }

    [Symbol.dispose](): void {
        this._emitter[Symbol.dispose]();
    }
}

export class AsyncEmitter extends EventEmitter implements Disposable {
    private _queue: Promise<void> = Promise.resolve();
    private _abortController: AbortController = new AbortController();

    /**
     * Asynchronously calls each of the listeners registered for the event named
     * `eventName`, in the order they were registered, passing the supplied
     * arguments to each.
     *
     * Returns `true` if the event had listeners, `false` otherwise.
     */
    override emit(eventName: string | symbol, ...args: unknown[]): boolean {
        this._queue = this._queue.then(async () => {
            try {
                // Use setImmediate to schedule the emit in the next iteration of the event loop.
                await setImmediate(undefined, { signal: this._abortController.signal });
                super.emit(eventName, ...args);
            } catch {
                // Ignore
            }
        });

        return this.listenerCount(eventName) > 0;
    }

    [Symbol.dispose](): void {
        if (!this._abortController.signal.aborted) {
            this.removeAllListeners();
            this._abortController.abort();
            this._queue = Promise.resolve();
        }
    }
}
