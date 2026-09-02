import _isEmpty from "lodash/isEmpty";
import type { Logger } from "winston";

import {
  del,
  flush,
  get,
  init as initRedis,
  type Options as RedisOptions,
  set,
} from "./redis";

export type Options = RedisOptions;
let logger: Logger;

export type Resolver<Args, Result> = (arg: Args) => Promise<Result>;

function init(conf: Options) {
  logger = conf.logger;

  return initRedis(conf);
}

const _shouldSave = (value: any) => value && !_isEmpty(value);

const _rememberValue = async <Args, Result>(
  setKey: string,
  expire: number,
  resolver: Resolver<Args, Result>,
  argsObject: Args,
) => {
  const cachedValue = await get(setKey).catch((err: Error) => {
    logger.warn(
      `Unable to get value for key ${setKey} err: ${JSON.stringify(err)}`,
    );
  });
  if (cachedValue) return JSON.parse(cachedValue);

  const resolvedValue = await resolver(argsObject);

  if (_shouldSave(resolvedValue)) {
    try {
      await set(setKey, resolvedValue, expire);
    } catch (err) {
      logger.warn(
        `Unable to set remembered value for key ${setKey} err: ${JSON.stringify(err)}`,
      );
    }
  }

  return resolvedValue;
};

const _forgetKeys = async (keys: string | string[]) => {
  try {
    await del(keys);
  } catch (err) {
    // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
    logger.warn(`Unable to forgetKeys for keys ${keys} err: ${err}`);
  }
};

async function remember<Args, Result>(
  idKey: string,
  expire: number,
  enabled: boolean,
  resolver: Resolver<Args, Result>,
  argsObject: Args,
) {
  return enabled
    ? _rememberValue(idKey, expire, resolver, argsObject)
    : resolver(argsObject);
}

async function forget<Args, Result>(
  idKey: string,
  enabled: boolean,
  resolver: Resolver<Args, Result>,
  argsObject: Args,
) {
  if (enabled) {
    await _forgetKeys(idKey);
  }

  return resolver(argsObject);
}

export default {
  init,
  flush,
  remember,
  forget,
};
