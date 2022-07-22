import { web3, BN } from "@project-serum/anchor";

export function convertNumbersToBNs(
  data: Object | any[],
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
  data: Object | any[],
  keysToUpdate: string[] = []
) {
  return convertTypeToType(
    data,
    keysToUpdate,
    "string",
    (value) => new web3.PublicKey(value)
  );
}

export function convertTypeToType(
  data: Object | any[],
  keysToUpdate: string[],
  existingType: string,
  toType: (arg0: any) => any
) {
  if (!data) {
    return data;
  }

  if (Array.isArray(data)) {
    return data.map((item) => {
      if (typeof item == existingType) {
        return toType(item);
      }

      if (keysToUpdate && keysToUpdate.length > 0) {
        let parsedKeys = keysToUpdate[0].split(".");
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
    });
  }

  keysToUpdate &&
    keysToUpdate.forEach((key) => {
      let parsedKeys = key.split(".");
      const [firstKey, ...remainingKeys] = parsedKeys;
      if (parsedKeys.length == 1) {
        if (Array.isArray(data[firstKey])) {
          data[firstKey] = convertTypeToType(
            data[firstKey],
            [],
            existingType,
            toType
          );
        }

        if (typeof data[firstKey] == existingType) {
          data[firstKey] = toType(data[firstKey]);
        }
      } else if (data[firstKey]) {
        data[firstKey] = convertTypeToType(
          data[firstKey],
          [remainingKeys.join(".")],
          existingType,
          toType
        );
      }
    });
  return data;
}
