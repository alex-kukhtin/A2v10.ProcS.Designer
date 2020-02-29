(function () {

	const eventBus = window.app.$EventBus;
	const graphProperties = {
		template: `
<div class="graph-properties" ref="canvas">
	<ul v-if="selected">
		<li v-for="tr in selected.Transitions">
			<span v-text="tr.Name"></span><input type="text" v-model="tr.Name"/><button @click.stop.prevent="removeTransaction(tr)">x</button>
		</li>
	</ul>
	<button @click.stop.prevent="addTransition">Add Transition</button>
	<pre v-text="model"></pre>
</div>
`,
		data: function () {
			return {
				selected: null
			};
		},
		props: {
			model: Object
		},
		methods: {
			removeTransaction: function (tr) {
				this.selected.deleteTransition(tr);
			},
			addTransition: function () {
				if (!this.selected) return;
				this.selected.addTransition();
			},
			setSelection: function (sel) {
				this.selected = sel;
			}
		},
		mounted: function () {
			eventBus.$on('vertex.select', this.setSelection);
		},
		beforeDestroy: function () {
			eventBus.$off('vertex.select', this.setSelection);
		}
	};

	Vue.component("a2-mxgraph-properties", graphProperties);
})();