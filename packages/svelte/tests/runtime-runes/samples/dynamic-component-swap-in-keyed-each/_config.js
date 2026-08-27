import { flushSync } from 'svelte';
import { test } from '../../test';

export default test({
	async test({ assert, target }) {
		const [flip, swap] = target.querySelectorAll('button');
		const html = () => [...target.querySelectorAll('span')].map((s) => s.textContent).join('');

		assert.equal(html(), 'a0a1a2', 'initial');
		flushSync(() => flip?.click());
		assert.equal(html(), 'a2a1a0', 'reorder before swap');
		// after a swap the branch is replaced, so an eagerly-handed-over boundary could go stale
		flushSync(() => swap?.click());
		assert.equal(html(), 'b2b1b0', 'swap');
		flushSync(() => flip?.click());
		assert.equal(html(), 'b0b1b2', 'reorder AFTER swap');
		flushSync(() => flip?.click());
		assert.equal(html(), 'b2b1b0', 'reorder again');
	}
});
