import { BN } from "@project-serum/anchor";

export function convertNumbersToBNs(data: Object | any[], keysToUpdate?: string[]) {
  if (Array.isArray(data)) {
    return data.map(item => {
      if (typeof item == "number") {
        return new BN(item);
      }

      if (keysToUpdate?.length > 0) {
        let parsedKeys = keysToUpdate[0].split(".");
        const [firstKey, ...remainingKeys] = parsedKeys;
        if (firstKey === "[]" && remainingKeys?.length > 0) {
          return convertNumbersToBNs(item, [remainingKeys.join(".")]);
        }
      }

      return item;
    });
  }

  keysToUpdate.forEach((key) => {
    let parsedKeys = key.split(".");
    const [firstKey, ...remainingKeys] = parsedKeys;
    if (parsedKeys.length == 1) {
      if (Array.isArray(data[firstKey])) {
        data[firstKey] = convertNumbersToBNs(data[firstKey]);
      }

      if (typeof data[firstKey] == "number") {
        data[firstKey] = new BN(data[firstKey]);
      }
    } else {
      data[firstKey] = convertNumbersToBNs(data[firstKey], [remainingKeys.join(".")]);
    }
  });

  return data;
}
