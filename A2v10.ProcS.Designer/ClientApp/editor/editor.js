
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