<!-- AUTHORED fixture (model-written for the gold-extractor self-test; not natural data) -->
<template>
  <div id="app" class="big">{{ msg }}</div>
</template>

<script>
import Button from "./Button.vue";
export default { name: "App", data() { return { msg: "hi" }; } };
</script>

<style>
.big { color: red; }
</style>
