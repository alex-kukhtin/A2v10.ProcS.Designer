
(function () {

	const MxEditor = window.mxEditor;
	const MxCodec = window.mxCodec;
	const MxUtils = window.mxUtils;
	const MxCellRenderer = window.mxCellRenderer;
	const MxShape = window.mxShape;

	function getConfig() {
		let xml = `
<mxEditor>
<Array as="templates">
<add as="Task">
	<Task label="Task" description="">
		<mxCell vertex="1" style="rounded">
			<mxGeometry as="geometry" width="72" height="32"/>
		</mxCell>
	</Task>
</add>
<add as="Start">
	<Start description="process start">
		<mxCell vertex="1" style="shape=start;fillColor=#0691e5;resizable=0">
			<mxGeometry as="geometry" width="50" height="50" x="200" y="10"/>
		</mxCell>
	</Start>
</add>
</Array>
</mxEditor>
`;
		var parser = new DOMParser();
		var doc = parser.parseFromString(xml, "application/xml");
		console.dir(doc);
		return doc.documentElement;
	}

	function ShapeStart() {
		MxShape.call(this);
	}
	MxUtils.extend(ShapeStart, MxShape);

	ShapeStart.prototype.paintBackground = function (c, x, y, w, h) {
		console.dir(c);
		c.translate(x, y);
		c.ellipse(0, 0, w, h);
		c.fillAndStroke();
		c.setStrokeColor("#ffffff");
		c.setStrokeWidth(3);
		c.begin();
		c.moveTo(w / 3, h/4);
		c.lineTo(3 * w / 4, h / 2);
		c.lineTo(w / 3, 3 * h / 4);
		c.lineTo(w / 3, h / 4);
		c.end();
		c.stroke();
	};

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
			console.dir(this.$refs);
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

			console.dir(MxCellRenderer.defaultShapes);
			MxCellRenderer.registerShape('start', ShapeStart);

			init(this.$editor);
		}
	});
})();