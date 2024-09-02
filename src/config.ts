import pickBy from "lodash/pickBy";
import startsWith from "lodash/startsWith";

function getConfiguration() {
  const config = pickBy(process.env, (_value, key) => startsWith(key, "CACHE"));

  return {
    keySeparator: config.CACHE_KEY_SEPARATOR || ":",
    prefix: config.CACHE_PREFIX || "cache",
  };
}

export default getConfiguration;
