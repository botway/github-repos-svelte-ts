<script lang="ts">
  import { Search } from "carbon-components-svelte";
  import { createEventDispatcher } from "svelte";
  import type { Repo, SearchResults } from "../types/types";
  import { get } from "../utils/api";

  const dispatch = createEventDispatcher();

  async function search(e: CustomEvent) {
    if (e.type !== "clear") {
      // @ts-ignore
      const data = await getData(e.target.value);
      dispatch("searchResults", {
        results: data.items as Repo[],
      });
    } else {
      dispatch("searchResults", {
        results: undefined,
      });
    }
  }

  async function getData(query: string): Promise<SearchResults> {
    const data = await get<SearchResults>(
      `https://api.github.com/search/repositories?q=${query}&page=0&per_page=100`
    );
    return data.parsedBody;
  }
</script>

<Search on:clear={search} on:change={search} />
