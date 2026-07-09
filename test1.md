---
layout: default
---
<style>
.observablehq:has(.observablehq--inspect) {
  display: none;
}
</style>
<div id="notebook"></div>
<script type="module">
import {Runtime, Inspector} from "https://cdn.jsdelivr.net/npm/@observablehq/runtime@5/dist/runtime.js";
import define from "https://api.observablehq.com/@nxrix/hypercomplex.js?v=4";
new Runtime().module(define, Inspector.into("#notebook"));
</script>
