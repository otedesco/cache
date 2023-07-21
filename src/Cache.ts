import _isEmpty from "lodash/isEmpty";
import type { Logger } from "winston";

import Redis, { Options as RedisOptions } from "./Redis";

export type Options = RedisOptions;
let logger: Logger;

export interface Resolver<Args, Result> {
  (arg: Args): Promise<Result>;
}

const _addSetValue = async (key: string, value: string, expire = 180) =>
  Redis.addToSet(key, value, expire);
const _shouldSave = (value: any) => value && !_isEmpty(value);

const _rememberValue = async <Args, Result>(
  setKey: string,
  key: string,
  expire: number,
  resolver: Resolver<Args, Result>,
  argsObject: Args,
) => {
  const cachedValue = await Redis.get(key).catch((err) => {
    logger.warn(`Unable to get value for key ${key} err: ${err}`);
  });
  if (cachedValue) return JSON.parse(cachedValue);

  const resolvedValue = await resolver(argsObject);

  if (_shouldSave(resolvedValue)) {
    try {
      await Redis.set(key, resolvedValue, expire);
      await _addSetValue(setKey, key, expire);
    } catch (err) {
      // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
      logger.warn(`Unable to set remembered value for key ${key} err: ${err}`);
    }
  }

  return resolvedValue;
};

const _forgetKeys = async (keys: string | string[]) => {
  try {
    await Redis.del(keys);
  } catch (err) {
    // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
    logger.warn(`Unable to forgetKeys for keys ${keys} err: ${err}`);
  }
};

const _forgetSetValues = async (key: string) => {
  try {
    const keys = await Redis.getSetMembers(key);

    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    if (keys) await _forgetKeys(keys);

    await _forgetKeys(key);
  } catch (err) {
    // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
    logger.warn(`Unable to forgetSetValues for key ${key} err: ${err}`);
  }
};

function init(conf: Options) {
  logger = conf.logger;

  return Redis.init(conf);
}

function deleteMatching(pattern: string) {
  return Redis.deleteMatching(pattern);
}

async function remember<Args, Result>(
  idKey: string,
  key: string,
  expire: number,
  enabled: boolean,
  resolver: Resolver<Args, Result>,
  argsObject: Args,
) {
  return enabled
    ? _rememberValue(idKey, key, expire, resolver, argsObject)
    : resolver(argsObject);
}

async function rememberSearch<Args, Result>(
  searchKey: string,
  key: string,
  expire: number,
  enabled: boolean,
  resolver: Resolver<Args, Result>,
  argsObject: Args,
) {
  return enabled
    ? _rememberValue(searchKey, key, expire, resolver, argsObject)
    : resolver(argsObject);
}

async function forgetSearch<Args, Result>(
  searchKey: string,
  rootKey: string | string[],
  enabled: boolean,
  resolver: Resolver<Args, Result>,
  argsObject: Args,
) {
  if (enabled) {
    await _forgetSetValues(searchKey);
    await _forgetKeys(rootKey);
  }

  return resolver(argsObject);
}

async function forgetAll<Args, Result>(
  idKey: string,
  // searchKey: string,
  rootKey: string,
  enabled: boolean,
  resolver: Resolver<Args, Result>,
  argsObject: Args,
) {
  if (enabled) {
    await _forgetSetValues(idKey);
    // await _forgetSetValues(searchKey);
    await _forgetKeys(rootKey);
  }

  return resolver(argsObject);
}

const flush = Redis.flush;

export default {
  init,
  flush,
  deleteMatching,
  remember,
  rememberSearch,
  forgetAll,
  forgetSearch,
};
