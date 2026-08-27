/** @import { Effect, TemplateNode, Dom } from '#client' */
import { EFFECT_TRANSPARENT } from '#client/constants';
import { block } from '../../reactivity/effects.js';
import {
	hydrate_next,
	hydrate_node,
	hydrating,
	read_hydration_instruction,
	set_hydrate_node,
	set_hydrating,
	skip_nodes
} from '../hydration.js';
import { active_effect } from '../../runtime.js';
import { BranchManager } from './branches.js';
import { HYDRATION_START, HYDRATION_START_ELSE } from '../../../../constants.js';

/**
 * @template P
 * @template {(props: P) => void} C
 * @param {TemplateNode} node
 * @param {() => C} get_component
 * @param {(anchor: TemplateNode, component: C) => Dom | void} render_fn
 * @returns {void}
 */
export function component(node, get_component, render_fn) {
	/** @type {TemplateNode | undefined} */
	var hydration_start_node;

	if (hydrating) {
		hydration_start_node = hydrate_node;
		hydrate_next();
	}

	// When this block is the sole content of its parent, the parent owns no nodes of its own —
	// the DOM belongs to our branch. Hand the boundary over so that consumers such as `{#each}`
	// reconciliation can find it without having to walk the effect tree.
	var owner = /** @type {Effect} */ (active_effect);
	var standalone = owner.nodes === null;
	var hydrated_boundary = false;

	var branches = new BranchManager(node);

	block(() => {
		var component = get_component() ?? null;

		if (hydrating) {
			var data = read_hydration_instruction(/** @type {TemplateNode} */ (hydration_start_node));

			var server_had_component = data === HYDRATION_START;
			var client_has_component = component !== null;

			if (server_had_component !== client_has_component) {
				// Hydration mismatch: skip the server-rendered nodes and render fresh
				var anchor = skip_nodes();

				set_hydrate_node(anchor);
				branches.anchor = anchor;

				set_hydrating(false);
				branches.ensure(component, component && ((target) => render(target, component)));
				set_hydrating(true);

				return;
			}
		}

		branches.ensure(component, component && ((target) => render(target, component)));
	}, EFFECT_TRANSPARENT);

	// Nothing else will step over the closing hydration marker, so do it here — and claim the
	// boundary, which spans the markers this block emitted. Otherwise `$.append` does both.
	if (hydrating && standalone) {
		owner.nodes = {
			start: /** @type {TemplateNode} */ (hydration_start_node),
			end: hydrate_node,
			a: null,
			t: null
		};

		hydrated_boundary = true;
		hydrate_next();
	}

	/**
	 * @param {TemplateNode} target
	 * @param {C} component
	 */
	function render(target, component) {
		render_fn(target, component);

		// the branch is replaced whenever the component changes, so the boundary has to be
		// handed over again — unless hydration already claimed the span of its markers
		if (standalone && !hydrating && !hydrated_boundary) {
			owner.nodes = /** @type {Effect} */ (active_effect).nodes;
		}
	}
}
