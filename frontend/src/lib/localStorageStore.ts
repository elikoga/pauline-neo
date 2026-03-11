import type { StartStopNotifier, Writable } from 'svelte/store';
import { writable } from 'svelte/store';

// function writable<T>(value?: T | undefined, start?: StartStopNotifier<T> | undefined): Writable<T>

export const writableLocalStorageStore = <T>(
  key: string,
  timeout?: number,
  defaultValue?: T | undefined,
  start?: StartStopNotifier<T> | undefined
): Writable<T> => {
  // check if localStorage is available
  if (typeof localStorage === 'undefined') {
    // just return a writable store
    return writable(defaultValue, start);
  }
  // get the value from localStorage
  const value = localStorage.getItem(key);
  let store: Writable<T>;
  // if there is no value in localStorage, use the default value
  if (value === null) {
    store = writable(defaultValue, start);
  } else {
    // parse the value from localStorage
    const parsedValue = JSON.parse(value);
    // return a writable store with the parsed value
    store = writable(parsedValue, start);
  }
  let localStorageTimer: NodeJS.Timeout;
  const debouncedLocalStorageSet = (value: T) => {
    // clear the timer
    if (localStorageTimer) {
      clearTimeout(localStorageTimer);
    }
    // set the timer
    localStorageTimer = setTimeout(() => {
      // set the value in localStorage
      localStorage.setItem(key, JSON.stringify(value));
    }, timeout ?? 100);
  };
  // when the store changes, save the new value to localStorage
  store.subscribe((newValue) => {
    debouncedLocalStorageSet(newValue);
  });
  return store;
};
