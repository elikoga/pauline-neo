<script lang="ts">
  import pkg from 'flexsearch';

  const { Document } = pkg;
  import { semesterNameStore, type CourseWithoutAppointments, cacheVersion } from '$lib/api';
  import { getCourses, cidCoursesCache } from '$lib/api';
  import Course from './Course.svelte';
  import { onMount } from 'svelte';
  import { browser } from '$app/environment';

  type Timeout = NodeJS.Timeout;

  let searchInput = '';

  let searchResults: CourseWithoutAppointments[] = [];

  const createLocalIndex = () =>
    new Document({
      document: {
        id: 'cid',
        index: ['cid', 'name', 'ou']
      },
      tokenize: 'full'
    });

  const localIndexCache = new Map<string, pkg.Document<unknown, false>>();
  // Records the cacheVersion at which each semester's index was last built.
  const localIndexBuiltAtVersion = new Map<string, number>();

  $: localIndexPopulatedPromise = (async () => {
    // Re-run whenever the semester changes OR the cache is busted.
    // Reading $cacheVersion here registers it as a reactive dependency.
    const _version = $cacheVersion;
    if (!$semesterNameStore) {
      return;
    }
    // Invalidate the in-memory index only if it was built before this version,
    // so a cache bust forces a rebuild without affecting unrelated semester changes.
    const builtAt = localIndexBuiltAtVersion.get($semesterNameStore) ?? -1;
    if (builtAt < _version) {
      localIndexCache.delete($semesterNameStore);
    }
    if (localIndexCache.has($semesterNameStore)) {
      return localIndexCache.get($semesterNameStore);
    }
    // create a new local index
    const index = createLocalIndex();

    await getCourses();
    await Promise.all(
      [...cidCoursesCache.entries()].map(([{ semesterName }, course]) => {
        if (semesterName === $semesterNameStore) {
          index.add(course);
        }
      })
    );
    localIndexCache.set($semesterNameStore, index);
    localIndexBuiltAtVersion.set($semesterNameStore, _version);
    return index;
  })();

  let abortController: AbortController;

  $: if (browser) {
    $semesterNameStore;
    // abort previous search
    abortController?.abort();
    // create new AbortController
    abortController = new AbortController();
    localSearch(searchInput, abortController.signal);
  }

  const localSearch = async (searchInput: string, signal: AbortSignal) => {
    // if signal is aborted, just return
    if (signal.aborted) return;
    // if no search term, show all courses
    const localIndex = await localIndexPopulatedPromise;
    if (!localIndex) return;
    if (searchInput === '') {
      searchResults = [...cidCoursesCache.entries()]
        .flatMap(([{ semesterName }, course]) => {
          if (semesterName === $semesterNameStore) {
            return [course];
          } else {
            return [];
          }
        })
        .slice(0, 100); // limit to 100 results
    } else {
      console.log('Searching for:', searchInput);
      const results = await localIndex.searchAsync(searchInput);
      // if signal is aborted, just return
      if (signal.aborted) return;
      searchResults = [...new Set(results.flatMap((result) => result.result))].map((cid) => {
        // if cid is number, throw error
        if (typeof cid === 'number') throw new Error('cid is number');
        const course = cidCoursesCache.get({ cid, semesterName: $semesterNameStore });
        if (!course) throw new Error(`Could not find course with cid: ${cid}`);
        return course;
      });
    }
  };

  onMount(async () => {
    if (browser) {
      abortController = new AbortController();
      await localIndexPopulatedPromise;
      localSearch(searchInput, abortController.signal);
    }
  });
</script>

<!-- search bar -->
<div class="flex flex-col w-full rounded h-full">
  <div class="relative">
    <input
      type="text"
      class="w-full border border-border rounded focus:ring-link focus:ring focus:ring-inset focus:outline-none bg-surface placeholder-slate-500 py-3 pl-10 pr-4"
      placeholder="Suche nach Kurs oder Fachbereich..."
      bind:value={searchInput}
    />
    <button class="absolute inset-0 right-auto group" type="submit" aria-label="Search">
      <svg
        class="w-4 h-4 shrink-0 fill-link ml-4 mr-2"
        viewBox="0 0 16 16"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M7 14c-3.86 0-7-3.14-7-7s3.14-7 7-7 7 3.14 7 7-3.14 7-7 7zM7 2C4.243 2 2 4.243 2 7s2.243 5 5 5 5-2.243 5-5-2.243-5-5-5z"
        />
        <path
          d="M15.707 14.293L13.314 11.9a8.019 8.019 0 01-1.414 1.414l2.393 2.393a.997.997 0 001.414 0 .999.999 0 000-1.414z"
        />
      </svg>
    </button>
  </div>
  <div class="py-4 px-2 flex flex-col overflow-y-hidden">
    <span class="text-s font-semibold text-muted uppercase">Kurse</span>
    <div class="flex flex-col overflow-y-auto">
      {#await localIndexPopulatedPromise}
        Loading...
      {:then _}
        {#each searchResults as course (course.cid)}
          <Course courseInfo={course} />
        {:else}
          <p>Keine Ergebnisse gefunden</p>
        {/each}
      {/await}
    </div>
  </div>
</div>

<style>
</style>
