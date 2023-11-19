# `@cameronhunter/pending-promises`

[![npm package](https://img.shields.io/npm/v/%40cameronhunter/pending-promises)](https://www.npmjs.com/package/@cameronhunter/pending-promises)
[![CI Status](https://github.com/cameronhunter/pending-promises/actions/workflows/CI.yml/badge.svg)](https://github.com/cameronhunter/pending-promises/actions/workflows/CI.yml)

> A map of pending promises that can be resolved/rejected at a later time.

This data structure is helpful for converting event-based APIs to promise-based.

## Usage

```ts
import { PendingPromises } from '@cameronhunter/pending-promises';

class MyAPI {
    readonly #responses: PendingPromises = new PendingPromises();
    readonly #ws: WebSocket;

    constructor(ws: WebSocket) {
        ws.once('close', this.dispose.bind(this));

        ws.on('message', this.#onMessage.bind(this));

        this.#ws = ws;
    }

    send(message: string): Promise<string> {
        // Create a new pending promise
        const [id, promise] = this.#responses.create<string>();

        ws.send(JSON.stringify({ id, message }), (err) => {
            if (err) {
                this.#responses.reject(id, err);
            }
        });

        return promise;
    }

    async dispose(): Promise<void> {
        this.#ws.removeAllEventListeners();

        if (this.#ws.readyState !== WebSocket.CLOSED || this.#ws.readyState !== WebSocket.CLOSING) {
            const closed = once(this.#ws, 'close');

            // Will terminate any pending promises.
            this.#responses.dispose();

            this.#ws.close();

            return closed;
        }
    }

    #onMessage(event: WebSocket.MessageEvent): void {
        const { id, result, error } = JSON.parse(event.data as string);

        if (id) {
            // Resolve or reject the pending promise.
            error ? this.#responses.reject(id, error) : this.#responses.resolve(id, result);
        }
    }
}
```
