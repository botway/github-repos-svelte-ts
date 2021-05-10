<script lang="ts">
  import { Select, SelectItem } from "carbon-components-svelte";
  import { createEventDispatcher } from "svelte";

  const dispatch = createEventDispatcher();

  function selectTheme(event: CustomEvent) {
    dispatch("themeSelected", {
      theme: event.detail,
    });
  }

  let theme: "g100" = "g100";
</script>

<div id="theme-selector">
  <h1>Github Public Repos</h1>
  <div>
    <Select selected={theme} on:change={selectTheme}>
      <SelectItem value="white" text="White" />
      <SelectItem value="g10" text="Gray 10" />
      <SelectItem value="g90" text="Gray 90" />
      <SelectItem value="g100" text="Gray 100" />
    </Select>
  </div>
</div>

<style>
  #theme-selector {
    padding: 1rem 1rem 0;
    display: flex;
    justify-content: space-between;
  }
</style>
