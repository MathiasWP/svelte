<script>
	import A from './A.svelte';
	import B from './B.svelte';

	let items = $state([{ id: 0 }, { id: 1 }, { id: 2 }]);
	let Component = $state(A);
</script>

<button onclick={() => items.reverse()}>flip</button>
<button onclick={() => (Component = B)}>swap</button>

{#each items as item (item.id)}<Component id={item.id} />{/each}
