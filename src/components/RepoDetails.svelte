<script lang="ts">
  import { Column, Grid, Modal, Row } from "carbon-components-svelte";
  import { ImageLoader } from "carbon-components-svelte";
  import { Link } from "carbon-components-svelte";
  import { get } from "../utils/api";
  import { getReadme } from "../utils/getReadme";
  import type { RepoDetails } from "../types/types";

  export let open: boolean = false;
  export let fullName: string;

  async function getData(fullName: string): Promise<RepoDetails> {
    const data = await get<RepoDetails>(
      `https://api.github.com/repos/${fullName}`
    );
    return data.parsedBody;
  }
  const detailsPromise = getData(fullName);
</script>

{#await detailsPromise then details}
  <Modal
    passiveModal
    size="lg"
    modalHeading={details.full_name}
    bind:open
    on:open
    on:close
  >
    <div class="repo-details">
      <Grid style={"padding:0"}>
        <Row>
          <Column style={"padding:0"}>
            <ImageLoader
              fadeIn
              src={details.owner.avatar_url}
              alt={details.owner.login}
              width="128"
            />
          </Column>
          <!-- TODO tweak layout -->
          <Column style={"padding:1rem"}>
            <h3>⭐{details.stargazers_count}⭐</h3>
            <br />
            <h4>author:</h4>
            <Link href={details.owner.html_url} target="_blank">
              <h4>
                {details.owner.login}
              </h4>
            </Link>
            <br />
            <h4>title:</h4>
            <Link href={details.html_url} target="_blank">
              <h4>
                {details.name}
              </h4>
            </Link>
            <br /> <br />
            <p>latest commit: {details.updated_at}</p>
            <br />
            <p>{details.description}</p>
          </Column>
        </Row>
      </Grid>
      <p style={"white-space: pre-wrap"}>
        {#await getReadme(details.full_name) then readme}
          {readme}
        {/await}
      </p>
    </div>
  </Modal>
{/await}

<style>
  h4 {
    display: inline;
  }
  .repo-details {
    width: 100%;
    overflow: hidden;
  }
</style>
