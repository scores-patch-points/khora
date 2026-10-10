<!-- AUTHORED fixture (model-written for the gold-extractor self-test; not natural data) -->
<script>
  import Button from "./Button.svelte";
  let count = 0;
  function inc() { count += 1; }
</script>

<style>
  .big { color: red; }
</style>

<Button on:click={inc}>clicks: {count}</Button>
