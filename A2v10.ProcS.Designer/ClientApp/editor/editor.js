﻿
(function () {

	const MxEditor = window.mxEditor;
	const MxCodec = window.mxCodec;
	const MxUtils = window.mxUtils;
	const MxEditorConfig = window.mxEditorConfig;
	const MxEvent = window.mxEvent;
	const eventBus = window.app.$EventBus;

	function getConfig() {
		let xml = MxEditorConfig;
		var parser = new DOMParser();
		var doc = parser.parseFromString(xml, "application/xml");
		return doc.documentElement;
	}

	function init(editor, source) {

		let parent = editor.graph.getDefaultParent();
		let model = editor.graph.model;

		function insertTemplatedVertex(name, pos, p0) {
			p0 = p0 || parent;
			let tml = editor.templates[name];
			let clone = model.cloneCell(tml);
			clone.geometry.x = pos.x;
			clone.geometry.y = pos.y;
			// value is xml-node
			// clone.value = null;
			let xml = clone.value;
			model.add(p0, clone);
			return clone;
		}

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

			init.$vertex = insertTemplatedVertex("Start", init.pos);

			// vertices
			for (let s in source.States) {
				let state = source.States[s];
				let parent = insertTemplatedVertex(state.$shape, state.$position);
				setVertexAttributes(state, parent);
				state.$vertex = parent;
				// console.dir(parent.value.getAttribute('insidetop'));
				if (state.Transitions) {
					let pos = { x: 10, y: 40 };
					for (let t in state.Transitions) {
						let trans = state.Transitions[t];
						trans.$vertex = insertTemplatedVertex(trans.$shape, pos, parent);
						setVertexAttributes(trans, trans.$vertex);
						pos.y += 45;
					}
					parent.geometry.height = pos.y;
				}
			}

			let insertEdge = function insertEdge(from, toName) {
				let state = source.States[toName];
				if (!state) return;
				editor.graph.insertEdge(parent, null, null, from.$vertex, state.$vertex, null);
			};

			// start edge
			insertEdge(init, source.InitialState);
			//let firstVertex = source.States[source.InitialState];
			//editor.graph.insertEdge(parent, null, null, init.$vertex, firstVertex.$vertex, null);

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

			//insertTemplatedVertex("EndSuccess", { x: 200, y: 20 });
			//insertTemplatedVertex("EndError", { x: 400, y: 20 });

			
			//tml = editor.templates['Condition'];
			//clone = model.cloneCell(tml);
			//console.dir(clone);
			//model.add(parent, clone);

			//var v6 = editor.graph.insertVertex(parent, null, 'X2', 340, 110, 80, 80, 'shape=endSuccess;');
			//var v5 = editor.graph.insertVertex(parent, null, 'A4', 520, 220, 40, 80, 'shape=endError');
			//var v7 = editor.graph.insertVertex(parent, null, 'O1', 250, 260, 80, 60, 'shape=or;direction=south');

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
	</div>
	<div ref="canvas" class="graph-container"></div>
	<a2-graph-properties :model="selectedObject" :getEditor="getEditor" class="graph-properties"><a2-editor-properties>
</div>
`,
		props: {
			model: Object
		},
		data: function () {
			return {
				editor: null,
				selectedObject: null
			};
		},
		methods: {
			showModel: function () {
				let codec = new MxCodec();
				let result = codec.encode(this.$editor.graph.getModel());
				let xml = MxUtils.getPrettyXml(result);
				alert(xml);
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

			let g = this.$editor.graph;
			g.setPanning(true);
			g.panningHandler.useLeftButtonForPanning = true;
			g.setConnectable(true);
			g.setCellsEditable(false);
			g.setAllowDanglingEdges(false);
			g.setConnectableEdges(false);
			g.setDisconnectOnMove(false);
			g.setTooltips(false);

			g.getModel().addListener(MxEvent.CHANGE, (model, evt) => {
				if (document.activeElement)
					document.activeElement.blur();

				for (let ch of evt.properties.changes) {
					if (!ch.cell || !ch.cell.value) continue;
					eventBus.$emit('cell.change', ch.cell);
				}
			});

			g.getSelectionModel().addListener(MxEvent.CHANGE, (model, evt) => {
				if (model.cells.length === 1) {
					let cell = model.cells[0];
					if (cell.value) {
						this.selectedObject = cell;
						return;
					}
				}
				this.selectedObject = null;
			});

			init(this.$editor, this.model);
		}
	});
})();