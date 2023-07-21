import _ from "lodash";

import { KEY_SEPARATOR, PREFIX } from "./config";

export interface ArgsMapper<T extends object> {
  (args: T): T;
}

const normalizeValue = (value: string) => {
  // const stringValue = JSON.stringify(value);
  const newValue = value.replace(/\s+/, "-").toLowerCase();

  return newValue;
};

const getModifiedObject = <T extends object>(
  object: T,
  argsMapper?: ArgsMapper<T>,
): T => {
  let modified = object;
  if (argsMapper) modified = argsMapper(object);

  return modified;
};

export const buildRootKey = (prefix: string) =>
  `${PREFIX}${KEY_SEPARATOR}${prefix}${KEY_SEPARATOR}rootKey`;

export const buildPattern = (customPattern: string) =>
  `${PREFIX}${KEY_SEPARATOR}${customPattern || "*"}`;

export const buildKey = <T extends object>(
  prefix: string,
  object: T,
  argsMapper?: ArgsMapper<T>,
): string => {
  const modified = getModifiedObject(object, argsMapper);
  if (_.isEmpty(modified)) return buildRootKey(prefix);

  const generatedKey = _.chain(Object.entries(modified))
    .reduce(
      (array: string[], [key, value]) =>
        value !== undefined
          ? // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
            [...array, `${key}${KEY_SEPARATOR}${normalizeValue(value)}`]
          : array,
      [],
    )
    .sort()
    .reduce(
      (array: string[], key: string) =>
        key.match(/id:/) ? [key, ...array] : [...array, key],
      [],
    )
    .flatten()
    .join(KEY_SEPARATOR)
    .value();

  return `${PREFIX}${KEY_SEPARATOR}${prefix}${KEY_SEPARATOR}${generatedKey}`;
};

export const buildIdKey = <T extends object>(
  prefix: string,
  idColumns: string | string[],
  object: T,
  argsMapper?: ArgsMapper<T>,
): string => {
  const idObject = _.pick(getModifiedObject(object, argsMapper), idColumns);

  if (Object.keys(idObject).length !== idColumns.length)
    // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
    throw new Error(`Must have all id columns ${idColumns}`);

  return buildKey(`${prefix}${KEY_SEPARATOR}idKey`, idObject);
};
