import _ from "lodash";

import getConfig from "../config";

export type ArgsMapper<T extends object> = (args: T) => T;

const { prefix, keySeparator } = getConfig();

const normalizeValue = (value: string) => {
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

export const buildRootKey = (keyPrefix: string) =>
  `${prefix}${keySeparator}${keyPrefix}${keySeparator}rootKey`;

const buildKey = <T extends object>(
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
          ? [
              ...array,
              `${key}${keySeparator}${normalizeValue(value as string)}`,
            ]
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
    .join(keySeparator)
    .value();

  return `${prefix}${keySeparator}${prefix}${keySeparator}${generatedKey}`;
};

export const buildIdKey = <T extends object>(
  prefix: string,
  idColumns: string | string[],
  object: T,
  argsMapper?: ArgsMapper<T>,
): string => {
  const idObject = _.pick(getModifiedObject(object, argsMapper), idColumns);

  if (Object.keys(idObject).length !== idColumns.length)
    throw new Error(`Must have all id columns ${JSON.stringify(idColumns)}`);

  return buildKey(`${prefix}${keySeparator}idKey`, idObject);
};
