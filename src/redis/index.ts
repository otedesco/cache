import _isEmpty from "lodash/isEmpty";
import * as redis from "redis";
import type { Logger } from "winston";

export type Client = redis.RedisClientType;

let logger: Logger;
let client: redis.RedisClientType;
let CONFIG: redis.RedisClientOptions;

const _init = async (config: redis.RedisClientOptions) => {
  const connectingClient = redis.createClient(config);
  connectingClient.on("connect", () => {
    client = connectingClient as redis.RedisClientType;
  });

  await connectingClient.connect();
};

const _getClient = () => client;

const checkClient = () => {
  if (!client) {
    const ERR_MSG = "client not initialized";
    logger.error(ERR_MSG);

    throw new Error(ERR_MSG);
  }
};

const _set = async (key: string, value: any, expire = 300) => {
  checkClient();
  await client.set(key, JSON.stringify(value));
  await client.expire(key, expire);
};

const timeoutChecker = async (strategy: Promise<any>, timeoutMs = 100) => {
  const timeoutPromise = new Promise((_resolve, reject) => {
    setTimeout(() => {
      reject(new Error("Redis Timeout"));
    }, timeoutMs);
  });

  return Promise.race([strategy, timeoutPromise]);
};
export interface Options extends redis.RedisClientOptions {
  CONN_DELAY_MS?: number;
  CONN_TIMEOUT_MS?: number;
  logger: Logger;
}

export async function init({
  logger: _logger,
  CONN_DELAY_MS = 200,
  CONN_TIMEOUT_MS = 30 * 100,
  ...redisConfig
}: Options) {
  logger = _logger;
  logger.debug(`Starting Redis connection: ${JSON.stringify(redisConfig)}`);
  await _init(redisConfig);
  CONFIG = redisConfig;

  let i = 0;
  const initialTime = Date.now();
  while (!_getClient()) {
    i += 1;
    const elapsedTime = Date.now() - initialTime;

    if (elapsedTime > CONN_DELAY_MS) {
      logger.warn(`Redis connection is taking to long. So far: ${elapsedTime}`);
    }

    if (elapsedTime > CONN_TIMEOUT_MS) {
      throw new Error("Redis Connection Timeout");
    }
    const expDelay = i * CONN_DELAY_MS;
    // eslint-disable-next-line @typescript-eslint/no-loop-func
    await new Promise((resolve) => setTimeout(resolve, expDelay));
  }
}

function getClient(): redis.RedisClientType {
  let _client = _getClient();

  if (!_client) {
    void _init(CONFIG);
    _client = _getClient();
  }

  return _client;
}

function get(key: string): Promise<string> {
  const _client = getClient();

  return timeoutChecker(_client.get(key));
}

async function set<T>(key: string, value: T, expire = 180): Promise<void> {
  return timeoutChecker(_set(key, value, expire));
}

async function del(
  keys: string | string[],
  gotClient: redis.RedisClientType | null = null,
) {
  if (_isEmpty(keys)) return;

  const _client = gotClient ? gotClient : _getClient();

  await _client.del(keys);
}

async function flush() {
  const _client = _getClient();

  return _client.flushAll();
}

export default {
  init,
  get,
  set,
  del,
  flush,
};
