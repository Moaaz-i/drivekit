import https from 'node:https';
import http from 'node:http';

let sharedHttpsAgent: https.Agent | null = null;
let sharedHttpAgent: http.Agent | null = null;

export interface HttpAgentOptions {
  keepAlive?: boolean;
  maxSockets?: number;
  maxFreeSockets?: number;
  keepAliveMsecs?: number;
  timeout?: number;
}

/**
 * Returns a high-performance HTTPS Agent with persistent connection pooling
 * and Keep-Alive enabled to eliminate TCP/TLS handshake latency on Google APIs.
 */
export function getOptimizedHttpsAgent(options?: HttpAgentOptions): https.Agent {
  if (!sharedHttpsAgent) {
    sharedHttpsAgent = new https.Agent({
      keepAlive: options?.keepAlive ?? true,
      maxSockets: options?.maxSockets ?? 64,
      maxFreeSockets: options?.maxFreeSockets ?? 32,
      keepAliveMsecs: options?.keepAliveMsecs ?? 60000,
      timeout: options?.timeout ?? 30000,
      noDelay: true,
    });
  }
  return sharedHttpsAgent;
}

/**
 * Returns a high-performance HTTP Agent with connection pooling.
 */
export function getOptimizedHttpAgent(options?: HttpAgentOptions): http.Agent {
  if (!sharedHttpAgent) {
    sharedHttpAgent = new http.Agent({
      keepAlive: options?.keepAlive ?? true,
      maxSockets: options?.maxSockets ?? 64,
      maxFreeSockets: options?.maxFreeSockets ?? 32,
      keepAliveMsecs: options?.keepAliveMsecs ?? 60000,
      timeout: options?.timeout ?? 30000,
      noDelay: true,
    });
  }
  return sharedHttpAgent;
}
