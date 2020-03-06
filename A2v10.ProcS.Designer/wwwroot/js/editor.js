(function () {

	const MxUtils = window.mxUtils;
	const MxCellRenderer = window.mxCellRenderer;
	const MxShape = window.mxShape;

	// START shape
	function StartShape() {
		MxShape.call(this);
	}

	MxUtils.extend(StartShape, MxShape);

	StartShape.prototype.paintBackground = function (c, x, y, w, h) {
		console.dir(c);
		c.translate(x, y);
		c.ellipse(0, 0, w, h);
		c.fillAndStroke();
		//c.setStrokeColor("#ffffff");
		c.setStrokeWidth(3);
		c.begin();
		c.moveTo(w / 3, h / 4);
		c.lineTo(3 * w / 4, h / 2);
		c.lineTo(w / 3, 3 * h / 4);
		c.lineTo(w / 3, h / 4);
		c.end();
		c.stroke();
	};


	// Condition shape
	function ConditionShape() {
		MxShape.call(this);
		console.dir(this);
	}

	MxUtils.extend(ConditionShape, MxShape);

	MxCellRenderer.registerShape('start', StartShape);
	MxCellRenderer.registerShape('condition', ConditionShape);
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
		console.dir(doc);
		return doc.documentElement;
	}


	function init(editor) {
		let parent = editor.graph.getDefaultParent();
		let model = editor.graph.model;

		model.beginUpdate();
		try {

			let v = editor.graph.insertVertex(parent, null, "test", 20, 20, 80, 30);
			console.dir(v);

			let tml = editor.templates['Start'];
			let clone = model.cloneCell(tml);
			console.dir(clone);
			model.add(parent, clone);
			
			tml = editor.templates['Condition'];
			clone = model.cloneCell(tml);
			console.dir(clone);
			model.add(parent, clone);
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
		data: function () {
			return {
				editor: null
			};
		},
		methods: {
			showModel: function () {
				let codec = new MxCodec();
				let result = codec.encode(this.$editor.graph.getModel());
				let xml = MxUtils.getPrettyXml(result);
				alert(xml);
			}
		},
		mounted: function () {
			let el = this.$refs.canvas;
			this.$editor = new MxEditor(getConfig());
			this.$editor.setGraphContainer(el);

			console.dir(this.$editor.templates);

			let g = this.$editor.graph;
			g.setPanning(true);
			g.panningHandler.useLeftButtonForPanning = true;
			g.setConnectable(true);
			g.setCellsEditable(false);
			g.setAllowDanglingEdges(false);
			g.setConnectableEdges(false);
			g.setDisconnectOnMove(false);

			init(this.$editor);
		}
	});
})();