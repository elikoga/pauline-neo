import JsonStringifyMap from './JsonStringifyMap';
type Timeout = NodeJS.Timeout;

const replacer = (_key: unknown, value: unknown | Map<unknown, unknown>) => {
  if (value instanceof Map) {
    return {
      dataType: 'Map',
      value: Array.from(value.entries()) // or with spread: value: [...value]
    };
  } else {
    return value;
  }
};

const reviver = (_key: unknown, value: unknown) => {
  if (
    value instanceof Object &&
    'dataType' in value &&
    (value as { dataType: string }).dataType === 'Map'
  ) {
    const map = new Map<unknown, unknown>((value as unknown as { value: [unknown, unknown][] }).value);
    return map;
  } else {
    return value;
  }
};

export default class LocalStorageMap<K, V, MapType extends Map<K, V> = Map<K, V>>
  implements Map<K, V>
{
  key: string;
  private map: MapType;
  // constructor takes localStorage key name as well as all other parameters
  constructor(
    key: string,
    MapConstructor?: new <K1 extends K, V1 extends V>(entries?: readonly [K1, V1][] | null) => Map<
      K1,
      V1
    > extends MapType
      ? Map<K1, V1> | undefined
      : MapType,
    entries?: readonly [K, V][] | null
  ) {
    const RealMapConstructor = (MapConstructor || Map) as new <K, V>(
      entries?: readonly [K, V][] | null
    ) => MapType;
    this.key = key;
    // check if we have localStorage
    if (typeof localStorage === 'undefined') {
      throw new Error('LocalStorage is not supported');
    }
    console.log('initializing LocalStorageMap with key: ' + key);
    // check if we have the key in localStorage
    const json = localStorage.getItem(key);
    if (json) {
      console.log('found key in localStorage');
      // if we do, parse the JSON string and set the map
      try {
        this.map = new RealMapConstructor<K, V>(JSON.parse(json, reviver));
      } catch (e) {
        this.map = new RealMapConstructor<K, V>(entries);
      }
      // console.log('map: ' + json);
    } else {
      console.log('key not found in localStorage');
      // if we don't, create an empty map
      this.map = new RealMapConstructor(entries);
    }
  }

  private localStorageTimer: Timeout | undefined;
  private debouncedLocalStorageSet = (): void => {
    if (this.localStorageTimer) {
      clearTimeout(this.localStorageTimer);
    }
    this.localStorageTimer = setTimeout(() => {
      console.log('setting localStorage key: ' + this.key);
      localStorage.setItem(this.key, JSON.stringify(this.map, replacer));
    }, 1000);
  };

  clear(): void {
    this.map.clear();
    this.debouncedLocalStorageSet();
  }
  delete(key: K): boolean {
    const result = this.map.delete(key);
    this.debouncedLocalStorageSet();
    return result;
  }
  forEach(callbackfn: (value: V, key: K, map: Map<K, V>) => void, thisArg?: unknown): void {
    this.map.forEach(callbackfn, thisArg);
  }
  get(key: K): V | undefined {
    return this.map.get(key);
  }
  has(key: K): boolean {
    return this.map.has(key);
  }
  get size(): number {
    return this.map.size;
  }
  // set, delete and clear are overridden to save the map to localStorage
  set(key: K, value: V): this {
    this.map.set(key, value);
    this.debouncedLocalStorageSet();
    return this;
  }
  entries(): MapIterator<[K, V]> {
    return this.map.entries() as MapIterator<[K, V]>;
  }
  keys(): MapIterator<K> {
    return this.map.keys() as MapIterator<K>;
  }
  values(): MapIterator<V> {
    return this.map.values() as MapIterator<V>;
  }
  [Symbol.iterator](): MapIterator<[K, V]> {
    return this.entries();
  }
  get [Symbol.toStringTag](): string {
    return 'LocalStorage' + this.map[Symbol.toStringTag];
  }
}

export class LocalStorageJsonStringifyMap<K, V> extends LocalStorageMap<
  K,
  V,
  JsonStringifyMap<K, V>
> {
  constructor(key: string, entries?: readonly [K, V][] | null) {
    super(key, JsonStringifyMap, entries);
  }
}

export const makeAvaliableJsonStringifyMap = <K, V>(
  key: string
): JsonStringifyMap<K, V> | LocalStorageMap<K, V, JsonStringifyMap<K, V>> => {
  // check availability of localStorage
  // create appropriate map
  // return the map
  if (typeof localStorage === 'undefined') {
    return new JsonStringifyMap<K, V>();
  } else {
    return new LocalStorageMap<K, V, JsonStringifyMap<K, V>>(key, JsonStringifyMap);
  }
};

export const makeAvaliableMap = <K, V>(key: string): Map<K, V> | LocalStorageMap<K, V> => {
  // check availability of localStorage
  // create appropriate map
  // return the map
  if (typeof localStorage === 'undefined') {
    return new Map<K, V>();
  } else {
    return new LocalStorageMap<K, V>(key);
  }
};
