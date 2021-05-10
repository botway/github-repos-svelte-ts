<script lang="ts">
  import { DataTable } from "carbon-components-svelte";
  import { Pagination } from "carbon-components-svelte";
  import { get } from "../utils/api";
  import RepoDetails from "./RepoDetails.svelte";
  import type { Repo } from "../types/types";
  import { onMount } from "svelte";
  import Search from "./Search.svelte";

  let showDetails: boolean;
  let selectedRepo: string;
  const pageSizes = [10, 15, 20];
  let reposData: Repo[];
  let repos: Repo[];

  onMount(async () => {
    await initReposData();
  });

  async function getData(sinceId: number = 1): Promise<Repo[]> {
    const data = await get<Repo[]>(
      `https://api.github.com/repositories?since${sinceId}`
    );
    return data.parsedBody;
  }

  function handlePages(pageSize: number, page: number, data: Repo[]) {
    return data && data.slice(page, pageSize + page);
  }

  async function initReposData() {
    reposData = await getData();
    repos = handlePages(pageSizes[0], 0, reposData);
    repos = await getRepoExtras(repos);
  }

  async function onUpdate(event: CustomEvent, data: Repo[]) {
    const { pageSize, page } = event.detail;
    repos = handlePages(pageSize, page, data);
    repos = await getRepoExtras(repos);
  }

  function onClickRow(event: CustomEvent) {
    selectedRepo = event.detail.full_name;
    showDetails = true;
  }

  async function getRepoExtras(repos: Repo[]) {
    return Promise.all<Repo>(
      repos.map((repo) =>
        get<Repo>(`https://api.github.com/repos/${repo.full_name}`).then(
          (data) => data.parsedBody
        )
      )
    );
  }

  async function handleSearch(e: CustomEvent) {
    if (e.detail.results) {
      reposData = e.detail.results;
      repos = handlePages(pageSizes[0], 0, reposData);
    } else {
      await initReposData();
    }
  }
</script>

<Search on:searchResults={handleSearch} />
{#if reposData}
  <DataTable
    sortable
    headers={[
      { key: "owner.login", value: "Author" },
      { key: "name", value: "Title" },
      { key: "updated_at", value: "Latest Commit" },
      { key: "stargazers_count", value: "Stars" },
    ]}
    rows={repos}
    on:click:row={onClickRow}
  >
    <Pagination
      on:update={(e) => onUpdate(e, reposData)}
      totalItems={reposData.length}
      {pageSizes}
    />
    {#if showDetails}
      <RepoDetails
        on:close={() => (showDetails = false)}
        fullName={selectedRepo}
        open={true}
      />
    {/if}
  </DataTable>
{/if}
