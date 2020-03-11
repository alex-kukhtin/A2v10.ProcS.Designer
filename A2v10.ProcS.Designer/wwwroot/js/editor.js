// Copyright © 2019-2020 Alex Kukhtin. All rights reserved

app.modules['std:model'] = function () {

	return {
		constructModel
	};

	function processModel(model) {
		let r = {
			InitialState: '',
			$initPosition: {x:0, y:0},
			States: {}
		};

		function getGeometry(node) {
			let cell = findNode(node, 'mxCell');
			if (!cell) return pos;
			return findNode(cell, 'mxGeometry');
		}

		function getPosition(node) {
			let pos = { x: 0, y: 0 };
			let geo = getGeometry(node);
			if (!geo) return pos;
			pos.x = +geo.getAttribute('x');
			pos.y = +geo.getAttribute('y');
			return pos;
		}

		function createTransition(v) {
			let t = {
				$shape: 'Transition'
			};
			t.Name = v.node.getAttribute('Name');
			t.Condition = v.node.getAttribute('Condition');
			if (v.edge)
				t.To = v.edge.id || '';
			return t;
		}

		function createState(v) {
			let state = {
				$shape: v.type,
				$position: getPosition(v.node),
				Name: v.node.getAttribute("Name")
			};
			if (v.entry) {
				state.OnEntry = {};
			}
			if (v.transitions) {
				state.Transitions = {};
				for (let t in v.transitions) {
					let tr = v.transitions[t];
					state.Transitions[tr.id] = createTransition(tr);
				}
			}
			if (v.edge) {
				console.dir(v.edge);
				state.NextState = v.edge.id;
			}
			return state;
		}

		for (let s in model.v) {
			let st = model.v[s];
			if (st.type === 'Start') {
				if (st.edge)
					r.InitialState = st.edge.id || '';
				r.$initPosition = getPosition(st.node);
			} else {
				r.States[s] = createState(model.v[s]);
			}
		}
		return r;
	}

	function constructModel(xml) {

		let cells = {
			v: {}, e: []
		};
		let ch = xml.firstChild;  // root
		ch = ch.firstElementChild; // cells
		while (ch) {
			if (ch.nodeType === Node.ELEMENT_NODE) {
				if (getCellAttribute(ch, 'vertex')) {
					let p = getCellAttribute(ch, 'parent');
					if (p === '1')
						p = null;
					cells.v[ch.id] = { id: ch.id, type: ch.localName, parent: p, node: ch };
				} else if (getCellAttribute(ch, 'edge')) {
					cells.e.push({ source: ch.getAttribute('source'), target: ch.getAttribute('target'), node:ch });
				}
			} 
			ch = ch.nextSibling;
		}
		// distribute edges
		for (let e in cells.e) {
			let en = cells.e[e];
			let from = cells.v[en.source];
			let to = cells.v[en.target];
			if (to && from)
				from.edge = to;
		}
		// distribute parents
		for (let vn in cells.v) {
			let v = cells.v[vn];
			if (!v.parent) continue;
			let p = cells.v[v.parent];
			if (v.type === 'Transition') {
				if (!p.transitions)
					p.transitions = [];
				p.transitions.push(v);
				delete cells.v[vn];
			} else if (v.type === 'Entry') {
				p.entry = v;
				delete cells.v[vn];
			}
		}
		return processModel(cells);
	}

	function findNode(node, name) {
		if (node.localName === name)
			return node;
		let ch = node.firstElementChild;
		while (ch) {
			if (ch.localName === name)
				return ch;
			ch = ch.nextElementSibling;
		}
		return null;
	}

	function getCellAttribute(node, name) {
		if (!node) return null;
		if (node.localName !== 'mxCell')
			node = findNode(node, 'mxCell');
		if (!node) return null;
		return node.getAttribute(name);
	}

};

// Copyright © 2019-2020 Alex Kukhtin. All rights reserved

(function () {

	const MxEditorShapes = window.mxEditorShapes;
	const MxStencilRegistry = window.mxStencilRegistry;

	// register shapes from config
	function getConfig() {
		let xml = MxEditorShapes;
		if (!xml)
			return null;
		var parser = new DOMParser();
		var doc = parser.parseFromString(xml, "application/xml");
		return doc.documentElement;
	}

	(function registerEditorShapes() {
		let config = getConfig();
		if (!config) return;
		let shape = config.firstChild; 
		while (shape) {
			if (shape.nodeType === Node.ELEMENT_NODE && shape.nodeName === 'shape') {
				MxStencilRegistry.addStencil(shape.getAttribute('name'), new mxStencil(shape));
			}
			shape = shape.nextSibling;
		}
	})();

})();


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


(function () {

	const MxEditor = window.mxEditor;
	const MxGraph = window.mxGraph;
	const MxCodec = window.mxCodec;
	const MxUtils = window.mxUtils;
	const MxEditorConfig = window.mxEditorConfig;
	const MxEvent = window.mxEvent;
	const MxChildChange = window.mxChildChange;
	const MxCellAttributeChange = window.mxCellAttributeChange;

	const eventBus = require('std:eventBus');
	const moduleConstructor = require('std:model');

	let graph = null;

	function getConfig() {
		let xml = MxEditorConfig;
		var parser = new DOMParser();
		var doc = parser.parseFromString(xml, "application/xml");
		return doc.documentElement;
	}

	function blur() {
		if (document.activeElement)
			document.activeElement.blur();
	}

	function insertTemplatedVertex(editor, name, shape, pos, p0) {
		let tml = editor.templates[shape];
		let m = graph.model;
		p0 = p0 || graph.getDefaultParent();
		let clone = m.cloneCell(tml);
		if (name)
			clone.id = name;
		clone.geometry.x = pos.x;
		clone.geometry.y = pos.y;
		// value is xml-node
		// clone.value = null;
		let xml = clone.value;
		m.add(p0, clone);
		return clone;
	}


	function dropVertex(shape, pos, parentCell) {
		let ed = this;
		let parent = ed.graph.getDefaultParent();
		let m = ed.graph.model;
		m.beginUpdate();
		try {
			//TODO: get parent for transition, code
			let p0 = parent;
			let autoSize = false;
			if (shape.template === 'Transition') {
				console.dir('insert with parent');
				p0 = parentCell;
				pos.x = 10;
				pos.y = 40; // TODO - calc transtion pos
				autoSize = true;
			}
			let vx = insertTemplatedVertex(ed, 'SSS', shape.template, pos, p0);
			if (autoSize) {
				stateLayout(p0);
			}
		} finally {
			m.endUpdate();
		}
	}

	function stateLayout(v) {
		if (v.value.localName !== 'State') return;
		let tr = [];
		for (let i in v.children) {
			let c = v.children[i];
			if (c.value.localName === 'Transition')
				tr.push(c);
		}
		console.dir(tr);
		let pos = { x: 10, y: 40 };
		for (let i in tr) {
			let g = tr[i].geometry;
			g.x = pos.x;
			g.y = pos.y;
			pos.y += 40;
		}
		let pg = v.getGeometry().clone();
		if (pg.height === pos.y)
			return;
		pg.height = pos.y;
		console.dir(graph.resizeCell);
		graph.resizeCell(v, pg);
	}

	function init(editor, source) {

		let parent = graph.getDefaultParent();
		let model = graph.model;

		function setVertexAttributes(state, vertex) {
			for (p in state) {
				if (p.indexOf('$') === 0) continue;
				if (vertex.hasAttribute(p))
					vertex.setAttribute(p, state[p]);
			}
		}

		model.beginUpdate();
		try {

			// initial state
			let init = { name: source.InitialState, pos: source.$initPosition, $vertex:null };

			init.$vertex = insertTemplatedVertex(editor, 'Start', "Start", init.pos);

			// vertices
			for (let s in source.States) {
				let state = source.States[s];
				let parent = insertTemplatedVertex(editor, s, state.$shape, state.$position);
				setVertexAttributes(state, parent);
				state.$vertex = parent;
				if (state.Transitions) {
					//insertTemplatedVertex(editor, '', "Entry", { x: 10, y: 40 }, parent);
					let pos = { x: 0, y: 0 };
					for (let t in state.Transitions) {
						let trans = state.Transitions[t];
						trans.$vertex = insertTemplatedVertex(editor, t, trans.$shape, pos, parent);
						setVertexAttributes(trans, trans.$vertex);
					}
				}
				stateLayout(state.$vertex);
			}

			let insertEdge = function insertEdge(from, toName) {
				let state = source.States[toName];
				if (!state) return;
				editor.graph.insertEdge(parent, null, null, from.$vertex, state.$vertex, null);
			};

			// start edge
			insertEdge(init, source.InitialState);

			// edges
			for (let s in source.States) {
				let state = source.States[s];
				if (state.NextState) {
					insertEdge(state, state.NextState);
				}
				if (state.Transitions) {
					for (let t in state.Transitions) {
						let trns = state.Transitions[t];
						insertEdge(trns, trns.To);
					}
				}
			}
		}
		finally {
			model.endUpdate();
		}
	}

	Vue.component("a2-graph-editor", {
		template: 
`<div class="graph-editor">
	<div class="graph-toolbar">
		<button @click.stop.prevent="invoke('undo')">Undo</button>
		<button @click.stop.prevent="invoke('redo')">Redo</button>
		<button @click.stop.prevent="showModel">Show Model</button>
		<button @click.stop.prevent="constructModel">Construct Model</button>
	</div>
	<a2-graph-toolbox />
	<div ref="canvas" class="graph-container"></div>
	<a2-graph-properties :getEditor="getEditor" class="graph-properties" :modelText="modelText"/>
</div>
`,
		props: {
			model: Object
		},
		data: function () {
			return {
				editor: null,
				modelText: ''
			};
		},
		methods: {
			showModel: function () {
				let codec = new MxCodec();
				let text = codec.encode(this.$editor.graph.getModel());
				let xml = MxUtils.getPrettyXml(text);
				console.dir(xml);
			},
			constructModel: function () {
				let codec = new MxCodec();
				let xml = codec.encode(this.$editor.graph.getModel());
				let model = moduleConstructor.constructModel(xml);
				this.modelText = JSON.stringify(model, undefined, 2);
			},
			getEditor() {
				return this.$editor;
			},
			invoke(method) {
				this.$editor[method]();
			}
		},
		mounted: function () {
			let el = this.$refs.canvas;
			this.$editor = new MxEditor(getConfig());

			this.$editor.setGraphContainer(el);

			graph = this.$editor.graph;
			let g = graph;
			g.setPanning(true);
			g.panningHandler.useLeftButtonForPanning = true;
			g.setConnectable(true);
			g.setCellsEditable(false);
			g.setAllowDanglingEdges(false);
			g.setConnectableEdges(false);
			g.setDisconnectOnMove(false);
			g.setTooltips(false);
			g.setDropEnabled(true);

			g.getModel().addListener(MxEvent.NOTIFY, (model, evt) => {
				blur();
				for (let ch of evt.properties.changes) {
					if (ch instanceof MxChildChange) {
						if (ch.previous && ch.previous.value) {
							console.dir('notify');
							console.dir(ch.previous);
							stateLayout(ch.previous);
							let m = ch.model;
							//m.beginUpdate();
							try {
								//stateLayout(g, ch.previous);
							} finally {
								//m.endUpdate();
							}
						}
					} else if (ch instanceof MxCellAttributeChange) {
						if (!ch.cell || !ch.cell.value) continue;
						eventBus.$emit('cell.change', ch.cell);
					}
				}
			});

			g.addListener(MxEvent.CELLS_REMOVED, function (g, evt) {
				//var cells = evt.getProperty('cells');
				//let s1 = g.getModel().getCell('S1');
				//stateLayout(s1);
			});

			g.getSelectionModel().addListener(MxEvent.CHANGE, (model, evt) => {
				blur();
				if (model.cells.length === 1) {
					let cell = model.cells[0];
					if (cell.value) {
						eventBus.$emit('cell.select', cell);
						return;
					}
				}
				eventBus.$emit('cell.select', null);
			});

			init(this.$editor, this.model);
			eventBus.$emit('editor.init', { graph: this.$editor.graph, drop: dropVertex.bind(this.$editor) });
		}
	});
})();