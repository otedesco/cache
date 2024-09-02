import Cache, { type Options as CacheOptions, type Resolver } from "./cache";
import { type ArgsMapper, buildIdKey } from "./redis/keys";

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
  Cache.forget(
    buildIdKey(prefix, idColumns, argsObject, argsMapper),
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
