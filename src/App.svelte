<script lang="ts">
  import { Content } from "carbon-components-svelte";
  import Header from "./components/Header.svelte";
  import Theme from "./components/Theme.svelte";
  import Repos from "./components/Repos.svelte";

  let theme: "g10" = "g10";
</script>

<Theme persist bind:theme>
  <Header on:themeSelected={(e) => (theme = e.detail.theme)} />
  <Content style="background: none; padding: 1rem">
    <Repos />
  </Content>
</Theme>
