import Cache, { Options as CacheOptions, Resolver } from "./Cache";
import { ArgsMapper, buildIdKey, buildKey, buildRootKey } from "./Keys";

export type Options = CacheOptions;

function init(conf: Options) {
  return Cache.init(conf);
}

const cacheSimpleResponse = <Args extends object, Result>(
  idColumns: string | string[],
  prefix: string,
  expire: number,
  cacheEnabled: boolean,
  fn: Resolver<Args, Result>,
  argsObject: Args,
  argsMapper?: ArgsMapper<Args>,
) =>
  Cache.remember(
    buildIdKey(prefix, idColumns, argsObject, argsMapper),
    buildKey(prefix, argsObject, argsMapper),
    expire,
    cacheEnabled,
    fn,
    argsObject,
  );

const invalidateCache = <Args extends object, Result>(
  idColumns: string | string[],
  prefix: string,
  cacheEnabled: boolean,
  fn: Resolver<Args, Result>,
  argsObject: Args,
  argsMapper?: ArgsMapper<Args>,
) =>
  Cache.forgetAll(
    buildIdKey(prefix, idColumns, argsObject, argsMapper),
    buildRootKey(prefix),
    cacheEnabled,
    fn,
    argsObject,
  );

const flush = Cache.flush;

export default {
  init,
  cacheSimpleResponse,
  invalidateCache,
  flush,
};
