// Copyright © 2019-2020 Alex Kukhtin. All rights reserved

(function () {

	const MxUtils = window.mxUtils;
	const eventBus = require('std:eventBus');


	function makeDraggable(opts, el, shape) {

		function dragHandler(g, evt, cell, x, y) {
			opts.drop(shape, {x, y}, cell);
		}

		MxUtils.makeDraggable(el, opts.graph, dragHandler, null, 0, 0, true, true, true, null);
	}

	Vue.component("a2-graph-toolbox", {
		template:
			`<div class="graph-toolbox">
	<ul>
		<li ref="shape" v-for="s in shapes" v-text="s.name"></li>
	</ul>
</div>
`,
		data: function () {
			return {
				shapes: [
					{ name: 'State', template: 'State' },
					{ name: 'Transition', template: 'Transition' },
					{ name: 'EndSuccess', template: 'EndSuccess' },
					{ name: 'EndError', template: 'EndError' }
				]
			};
		},
		props: {

		},
		mounted: function () {
			let refs = this.$refs;
			let shapes = this.shapes;
			eventBus.$on('editor.init', function (opts) {
				for (let i in shapes)
					makeDraggable(opts, refs.shape[i], shapes[i]);
			});
		}
	});
})();
