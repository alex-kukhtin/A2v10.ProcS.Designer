
(function () {

	const MxCellAttributeChange = window.mxCellAttributeChange;

	const eventBus = require('std:eventBus');

	const baseProp = {
		props: {
			prop: Object,
			model: Object,
			updateValue: Function,
			comptype: String
		},
		computed: {
			label: function() {
				return this.prop.label;
			}
		},
		methods: {
			modelValue: function () {
				if (!this.model) return null;
				let v = this.model.value;
				if (!v) return null;
				return this.model.value.getAttribute(this.prop.name);
			},
			onChange: function (val) {
				this.updateValue(this.prop.name, val);
			},
			__onUpdate: function () {
				let mv = this.modelValue();
				if (this.$refs.input.value !== mv)
					this.$refs.input.value = mv;
			}
		},
		mounted: function () {
			eventBus.$on('cell.change', this.__onUpdate);
		},
		beforeDestroy() {
			eventBus.$off('cell.change', this.__onUpdate);
		}
	};

	const inputProp = {
		extends: baseProp,
		template: `
<div>
	<label v-text="label"/>
	<input v-bind:value="modelValue()" v-on:change="onChange($event.target.value)" ref="input"/>
</div>
`
	};

	const textareaProp = {
		extends: baseProp,
		template: `
<div>
	<label v-text="label"/>
	<textarea v-bind:value="modelValue()" v-on:change="onChange($event.target.value)" ref="input"/>
</div>
`
	};

	Vue.component("a2-graph-properties", {
		template: 
`<div class="graph-properties" :key="updateKey">
	<div v-if="visible">
		<h4 v-text="title"></h4>
		<component :is="p.type" v-for="p in modelProps" :prop="p" :model="model" :updateValue="updateValue" />
	</div>
	<pre class="code" v-text="modelText"/>
</div>
`,
		components: {
			'a2-prop-input': inputProp,
			'a2-prop-textarea': textareaProp
		},
		props: {
			modelText: String,
			getEditor: Function
		},
		data: function () {
			return {
				model: null,
				updateKey: 0
			};
		},
		computed: {
			visible: function () {
				return !!this.model;
			},
			modelProps: function () {
				let node = this.model.value;
				let ch = node.firstChild;
				let r = [];
				while (ch) {
					if (ch.nodeName === 'properties') {
						let sub = ch.firstChild;
						while (sub) {
							if (sub.nodeType === Node.ELEMENT_NODE) {
								r.push({ name: sub.tagName, label: sub.getAttribute('label'), type:'a2-prop-' + sub.getAttribute('type') });
							}
							sub = sub.nextSibling;
						}
					}
					ch = ch.nextSibling;
				}
				return r;
			},
			title: function () {
				if (!this.model || !this.model.value)
					return '';
				return this.model.value.tagName;
			}
		},
		methods: {
			updateValue: function (prop, val) {
				let ed = this.getEditor();
				let m = ed.graph.model;
				m.beginUpdate();
				try {
					var edit = new MxCellAttributeChange(this.model, prop, val);
					m.execute(edit);
				} finally {
					m.endUpdate();
				}
			},
			__onSelect: function (elem) {
				this.model = elem;
				this.updateKey += 1;
			}
		},
		mounted: function () {
			eventBus.$on('cell.select', this.__onSelect);
		},
		beforeDestroy() {
			eventBus.$off('cell.select', this.__onSelect);
		}
	});
})();