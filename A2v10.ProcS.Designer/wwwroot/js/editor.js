// Copyright © 2019-2020 Alex Kukhtin. All rights reserved

(function () {

	const MxUtils = window.mxUtils;
	const MxCellRenderer = window.mxCellRenderer;
	const MxShape = window.mxShape;
	const MxSwimlane = window.mxSwimlane;
	const MxEditorShapes = window.mxEditorShapes;
	const MxStencilRegistry = window.mxStencilRegistry;

	// Condition shape
	function ConditionShape() {
		MxSwimlane.call(this);
		console.dir(this);
	}

	MxUtils.extend(ConditionShape, MxSwimlane);

	MxCellRenderer.registerShape('condition', ConditionShape);

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

	const MxEditor = window.mxEditor;
	const MxCodec = window.mxCodec;
	const MxUtils = window.mxUtils;
	const MxEditorConfig = window.mxEditorConfig;

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
			model.add(p0, clone);
			return clone;
		}

		model.beginUpdate();
		try {

			// initial state
			let init = { name: source.InitialState, pos: source.$initPosition, $vertex:null };

			init.$vertex = insertTemplatedVertex("Start", init.pos);

			for (let s in source.States) {
				let state = source.States[s];
				let parent = insertTemplatedVertex(state.$shape, state.$position);
				if (state.Transitions) {
					let pos = { x: 10, y: 50 };
					for (let t in state.Transitions) {
						let trans = state.Transitions[t];
						insertTemplatedVertex(trans.$shape, pos, parent);
						pos.y += 50;
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
`<div>
	<div>
		<button @click.stop.prevent="$editor.undo">Undo</button>
		<button @click.stop.prevent="$editor.redo">Redo</button>
		<button @click.stop.prevent="showModel">Show Model</button>
	</div>
	<div ref="canvas" class="graph-container"></div>
</div>
`,
		props: {
			model: Object
		},
		data: function () {
			return {
				editor: null
			};
		},
		methods: {
			showModel: function () {
				let codec = new MxCodec();
				let result = codec.encode(this.$editor.graph.getModel());
				//let xml = MxUtils.getPrettyXml(result);
				//alert(xml);
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

			init(this.$editor, this.model);

			console.dir(g);
		}
	});
})();