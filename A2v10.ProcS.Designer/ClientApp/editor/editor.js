
(function () {

	const MxEditor = window.mxEditor;
	const MxGraph = window.mxGraph;
	const MxCodec = window.mxCodec;
	const MxUtils = window.mxUtils;
	const MxEditorConfig = window.mxEditorConfig;
	const MxEvent = window.mxEvent;
	const MxChildChange = window.mxChildChange;
	const MxCellAttributeChange = window.mxCellAttributeChange;
	const MxStackLayout = window.mxStackLayout;
	const MxMultiplicity = window.mxMultiplicity;

	const eventBus = require('std:eventBus');
	const moduleConstructor = require('std:model');

	let graph = null;

	function _dummy() {}

	MxGraph.prototype.validationAlert = _dummy;
	MxGraph.prototype.getLabel = function (cell) {
		if (cell.edge || !cell.value) return '';
		let v = cell.value;
		if (v.getAttribute('hasLabel') === 'false')
			return '';
		var desc = v.getAttribute('Description');
		return desc || v.localName;
	};

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

	function insertTemplatedVertex(editor, name, val, shape, pos, p0) {
		let tml = editor.templates[shape || 'State'];
		let m = graph.model;
		pos = pos || { x: 100, y: 100 };
		p0 = p0 || graph.getDefaultParent();
		let clone = m.cloneCell(tml);
		if (name)
			clone.id = name;
		if (val && val.$res)
			clone.setAttribute('__res', val.$res);
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
			let p0 = parent;
			if (shape.template === 'Transition' || shape.template !== 'State') {
				console.dir(parentCell);
				if (parentCell === null)
					return;
				p0 = parentCell;
			}
			let vx = insertTemplatedVertex(ed, 'SSS', null, shape.template, pos, p0);
		} finally {
			m.endUpdate();
		}
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

		// Configures the automatic layout for the states and entries
		editor.layoutSwimlanes = true;
		editor.createSwimlaneLayout = function () {
			var layout = new MxStackLayout(graph, false, 10, 0, 0, 10);
			layout.fill = true;
			layout.resizeParent = true;

			// Overrides the function to always return true
			layout.isVertexMovable = function (cell) {
				return true;
			};

			return layout;
		};

		let targetStates = ['State', 'EndSuccess', 'EndError'];
		graph.multiplicities.push(new MxMultiplicity(true, 'Start', null, null, 0, 1, targetStates, 'e1', 'e2'));
		graph.multiplicities.push(new MxMultiplicity(true, 'State', null, null, 1, 1, targetStates, 'e1', 'e2'));
		graph.multiplicities.push(new MxMultiplicity(true, 'Transition', null, null, 1, 1, targetStates, 'e1', 'e2'));
		graph.multiplicities.push(new MxMultiplicity(true, 'EndSuccess', null, null, 0, 0, null, 'e1', 'e2'));
		graph.multiplicities.push(new MxMultiplicity(true, 'EndError', null, null, 0, 0, null, 'e1', 'e2'));

		model.beginUpdate();
		try {

			// initial state
			let init = { name: source.InitialState, pos: source.$initPosition, $vertex:null };

			init.$vertex = insertTemplatedVertex(editor, name, 'Start', "Start", init.pos);

			// vertices
			for (let s in source.States) {
				let state = source.States[s];
				let parent = insertTemplatedVertex(editor, s, state, state.$shape, state.$position);
				setVertexAttributes(state, parent);
				state.$vertex = parent;
				let pos = { x: 0, y: 0 };
				if (state.OnEntry) {
					let onEntryV = insertTemplatedVertex(editor, name, null, 'Entry', state.$position, parent);
					let ea = state.OnEntry.Activities;
					if (ea) {
						for (let a of ea) {
							a.$vertex = insertTemplatedVertex(editor, null, a, 'Code', pos, onEntryV);
							setVertexAttributes(a, a.$vertex);
						}
					}
				}
				if (state.Transitions) {
					for (let t in state.Transitions) {
						let trans = state.Transitions[t];
						trans.$vertex = insertTemplatedVertex(editor, t, trans, trans.$shape, pos, parent);
						setVertexAttributes(trans, trans.$vertex);
					}
				}
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
				var m = this.$editor.graph.getModel();
				let xml = codec.encode(m);
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
					if (ch instanceof MxCellAttributeChange) {
						if (!ch.cell || !ch.cell.value) continue;
						eventBus.$emit('cell.change', ch.cell);
					}
				}
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