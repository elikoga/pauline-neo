export default class JsonStringifyMap<K, V> implements Map<K, V> {
  private map: Map<string, V>;
  constructor(entries?: readonly [K, V][] | null | { map: Map<string, V> }) {
    // console.log('entries:', entries, JSON.stringify(entries));
    if (entries?.map instanceof Map) {
      this.map = entries.map;
    } else {
      this.map = new Map<string, V>(entries?.map(([key, value]) => [JSON.stringify(key), value]));
    }
  }
  clear(): void {
    this.map.clear();
  }
  delete(key: K): boolean {
    return this.map.delete(JSON.stringify(key));
  }
  forEach(
    callbackfn: (value: V, key: K, map: Map<K, V>) => void,
    thisArg?: unknown
  ): void {
    this.map.forEach((value, key) => callbackfn(value, JSON.parse(key), this), thisArg);
  }
  get(key: K): V | undefined {
    return this.map.get(JSON.stringify(key));
  }
  has(key: K): boolean {
    return this.map.has(JSON.stringify(key));
  }
  set(key: K, value: V): this {
    this.map.set(JSON.stringify(key), value);
    return this;
  }
  get size(): number {
    return this.map.size;
  }
  entries(): MapIterator<[K, V]> {
    const iterator = (function* (map) {
      for (const [key, value] of map.entries()) {
        yield [JSON.parse(key), value] as [K, V];
      }
    })(this.map);
    return iterator as unknown as MapIterator<[K, V]>;
  }
  keys(): MapIterator<K> {
    const iterator = (function* (map) {
      for (const key of map.keys()) {
        yield JSON.parse(key) as K;
      }
    })(this.map);
    return iterator as unknown as MapIterator<K>;
  }
  values(): MapIterator<V> {
    return this.map.values() as unknown as MapIterator<V>;
  }
  [Symbol.iterator](): MapIterator<[K, V]> {
    return this.entries();
  }
  get [Symbol.toStringTag](): string {
    return 'JsonStringifyMap';
  }
}
