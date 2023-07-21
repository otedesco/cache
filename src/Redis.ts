import _isEmpty from "lodash/isEmpty";
import * as redis from "redis";
import type { Logger } from "winston";
export type Client = redis.RedisClientType;

let client: redis.RedisClientType;
let logger: Logger;
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

// const _get = (key: string): Promise<string> => {
//   checkClient();
//   logger.debug(`Searching key: ${key}`);

//   return client.getAsync(key);
// };

// const _remember = async <T>(key: string, resolver: () => Promise<T>, expire = 300): Promise<T | null> => {
//   const cachedValue = await _get(key);

//   if (cachedValue) return JSON.parse(cachedValue);
//   const resolveValue = await resolver();

//   if (resolveValue) {
//     _set(key, resolveValue, expire).catch(err =>
//       logger.warn(`Unable to set remembered value for key ${key} err: ${err}`),
//     );

//     return resolveValue;
//   }

//   return null;
// };

// const _del = (key: string) => {
//   checkClient();
//   logger.debug(`Delete cache: ${key}`);

//   return client.del(key);
// };

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

async function addToSet(key: string, val: string, ttl = 180) {
  const setTTL = ttl * 1.5;

  const _client = _getClient();

  return timeoutChecker(_client.sAdd(key, [val, "EX", String(setTTL)]));
}

async function createSet(key: string, values: string | string[]) {
  if (!values.length) return 0;

  const _client = _getClient();

  return timeoutChecker(_client.sAdd(key, values));
}
async function popFromSet(key: string) {
  const _client = _getClient();

  return timeoutChecker(_client.sPop(key));
}

async function getSetMembers(key: string) {
  const _client = _getClient();

  return timeoutChecker(_client.sMembers(key));
}

async function deleteMatching(
  pattern: string,
  cursor = 0,
  scanCount = 1000,
  deleteBatch = 100,
): Promise<void> {
  if (!pattern) return;

  const _client = _getClient();
  let keysToDelete: string[] = [];

  const { cursor: nCursor, keys: matchingKeys } = await _client.scan(cursor, {
    MATCH: pattern,
    COUNT: scanCount,
  });
  if (matchingKeys && matchingKeys.length)
    keysToDelete = [...keysToDelete, ...matchingKeys];

  if (keysToDelete.length > deleteBatch) {
    await del(keysToDelete, _client);
    keysToDelete = [];
  }

  return +nCursor
    ? deleteMatching(pattern, nCursor)
    : del(keysToDelete, _client);
}

export default {
  init,
  getClient,
  get,
  set,
  del,
  flush,
  addToSet,
  createSet,
  popFromSet,
  getSetMembers,
  deleteMatching,
};
