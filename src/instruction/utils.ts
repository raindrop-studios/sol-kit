import { web3, BN } from "@project-serum/anchor";

export function convertNumbersToBNs(
  data: Record<string, any> | any[],
  keysToUpdate: string[] = []
) {
  return convertTypeToType(
    data,
    keysToUpdate,
    "number",
    (value) => new BN(value)
  );
}

export function convertStringsToPublicKeys(
  data: Record<string, any> | any[],
  keysToUpdate: string[] = []
) {
  return convertTypeToType(
    data,
    keysToUpdate,
    "string",
    (value) => new web3.PublicKey(value)
  );
}

type Constructor<T = object> = new (...args: any[]) => T;

const isRecord = (b: any): b is Record<string, any> => {
  return typeof b === "object" && b !== null;
};

const isType = (item: any, typeInQuestion: string | Constructor) => {
  return (
    typeof typeInQuestion === "string" ? typeof item == typeInQuestion :
    (typeof item === "object" && !Array.isArray(item) && item instanceof (typeInQuestion as Constructor))
  );
};

/**
 * Runs `toType` over variables matching the patterns in keys from `existingType`
 * in order to convert them to the desired type
 * You may need to use with an `as` to satisfy Typescript:
 *    convertTypeToType(y, ["a"], "string", Number) as YourNewType
 */
export function convertTypeToType<
  TInput extends NonNullable<any> = NonNullable<any>,
  TOutput = any,
  TData extends { [key: string]: any } | any[] = { [key: string]: any } | any[],
  TResult extends { [Property in keyof TData]: any } | any[] =
    | { [Property in keyof TData]: any }
    | any[]
>(
  data: TData,
  keysToUpdate: string[],
  existingType: string | Constructor,
  toType: (arg0: TInput) => TOutput
): TResult {
  if (Array.isArray(data)) {
    return data.map((item) => {
      if (isType(item, existingType)) {
        return toType(item);
      }
      if (keysToUpdate && keysToUpdate.length > 0) {
        const parsedKeys = keysToUpdate[0].split(".");
        const [firstKey, ...remainingKeys] = parsedKeys;
        if (firstKey === "[]" && remainingKeys?.length > 0) {
          return convertTypeToType(
            item,
            [remainingKeys.join(".")],
            existingType,
            toType
          );
        }
      }

      return item;
    }) as TResult;
  }

  if (keysToUpdate && isRecord(data)) {
    keysToUpdate.forEach((key) => {
      const parsedKeys = key.split(".");
      const [firstKey, ...remainingKeys] = parsedKeys;
      if (firstKey in data) {
        if (parsedKeys.length === 1) {
          if (Array.isArray(data[firstKey])) {
            (data as Record<string, any>)[firstKey] = convertTypeToType(
              data[firstKey],
              [],
              existingType,
              toType
            );
          }
          if (isType(data[firstKey], existingType)) {
            (data as Record<string, any>)[firstKey] = toType(data[firstKey]);
          }
        } else {
          (data as Record<string, any>)[firstKey] = convertTypeToType(
            data[firstKey],
            [remainingKeys.join(".")],
            existingType,
            toType
          );
        }
      }
    });
  }

  return data as unknown as TResult;
}