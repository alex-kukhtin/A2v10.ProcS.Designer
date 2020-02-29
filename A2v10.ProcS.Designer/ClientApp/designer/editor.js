(function () {

	const eventBus = window.app.$EventBus;

	const MxGraph = window.mxGraph;
	const MxEdgeStyle = window.mxEdgeStyle;
	const MxConstants = window.mxConstants;
	const MxEvent = window.mxEvent;
	const MxGeometryChange = window.mxGeometryChange;

	const FONT_FAMILY = "Consolas,Courier New,Courier,monospace";
	const BLUE_COLOR = '#0691e5';
	const STROKE_COLOR = '#0791e5';
	const SHADOW_COLOR = '#77777733';

	(function setConstants() {
		let m = MxConstants;
		m.DEFAULT_FONTFAMILY = FONT_FAMILY;
		m.SHADOWCOLOR = SHADOW_COLOR;
		m.SHADOW_OFFSET_X = 2;
		m.SHADOW_OFFSET_Y = 2;
		m.RECTANGLE_ROUNDING_FACTOR = 0.02;
		m.EDGE_SELECTION_DASHED = false;
		m.EDGE_SELECTION_STROKEWIDTH = 3;
	})();

	function createStyles(g) {
		let ss = g.getStylesheet();
		let vs = ss.getDefaultVertexStyle();
		vs.fontSize = 13;
		//vs.fontStyle = 1; // 1-bold, 2-italic, 4-underline
		vs.rotatable = 0;
		vs.resizable = 0;
		vs.foldable = 0;
		vs.shadow = 1;

		let es = ss.getDefaultEdgeStyle();
		es.strokeWidth = 3;
		es.strokeColor = STROKE_COLOR;
		es.edgeStyle = MxEdgeStyle.ElbowConnector;
		es.rounded = true;

		ss.putCellStyle('start', {
			shape: 'ellipse',
			fillColor: BLUE_COLOR,
			cloneable: 0,
			strokeColor: BLUE_COLOR,
			verticalLabelPosition: 'top',
			verticalAlign: 'bottom',
			className: 'vertex-start'
		});
		ss.putCellStyle('icon', {
			shape: 'label',
			fontFamily: "A2v10",
			fontSize: 22,
			fontColor: "#ffffff",
			part: true
		});

		ss.putCellStyle("condition", {
			rounded: 1,
			resizable: 0,
			shadow: 0,
			movable: 0,
			strokeColor: 'none',
			fillColor: 'azure',
			part: true
		});

	}

	function createGraph(el) {
		const g = new MxGraph(el);
		createStyles(g);
		g.setPanning(true);
		g.panningHandler.useLeftButtonForPanning = true;
		g.setConnectable(true);
		g.setCellsEditable(false);
		g.setAllowDanglingEdges(false);
		g.setConnectableEdges(false);

		g.getLabel = function (cell) {
			if (cell.edge) return '';
			if (typeof cell.value === 'object')
				return cell.value ? cell.value.Name : '';
			return cell.value;
		};

		g.isPart = function (cell) {
			var state = this.view.getState(cell);
			var style = state ? state.style : this.getCellStyle(cell);
			return style['part'] === true;
		};

		// Redirects selection to parent
		g.selectCellForEvent = function (cell) {
			if (this.isPart(cell))
				cell = this.model.getParent(cell);
			MxGraph.prototype.selectCellForEvent.apply(this, arguments);
		};

		g.getModel().addListener(MxEvent.CHANGE, (model, evt) => {
			for (let ch of evt.properties.changes) {
				console.dir(ch);
				if (!ch.cell || !ch.cell.value) continue;
				if (ch instanceof MxGeometryChange) {
					ch.cell.value.setGeometry(ch.cell.geometry);
				}
			}
		});

		g.getSelectionModel().addListener(MxEvent.CHANGE, (model, evt) => {
			if (model.cells.length === 1) {
				let cell = model.cells[0];
				console.dir(cell.value);
				eventBus.$emit('vertex.select', cell.value);
			} else {
				eventBus.$emit('vertex.select', null);
			}
		});

		let ctors = window.app.$Constructors;

		ctors.$State.prototype.$addTransitionToGraph = function (trns) {
			g.getModel().beginUpdate();
			try {
				let vertex = this.__Vertex;
				let tv = trns.vertex;
				let cond = g.insertVertex(vertex, null, trns, tv.x, tv.y, tv.w, tv.h, tv.style, false);
				trns.__Vertex = cond;
				let geo = vertex.getGeometry();
				geo.height = this.getHeight();
				vertex.setGeometry(geo);
			} finally {
				g.getModel().endUpdate();
			}
		};

		ctors.$State.prototype.$removeTr

		return g;
	}

	function fillGraph(g, model) {
		const m = g.getModel();
		const parent = g.getDefaultParent();
		m.beginUpdate();
		try {
			for (let state of model.States) {
				let v = state.vertex;
				let vert = g.insertVertex(parent, null, state, v.x, v.y, v.w, v.h, v.style);
				state.__Vertex = vert;
				if (v.icon) {
					let icon = g.insertVertex(vert, null, v.icon, .5, .47, 0, 0, "icon", true);
					icon.setConnectable(false);
				}
				if (v.vertices) {
					for (let sub of v.vertices) {
						let sv = sub.vertex;
						let subVert = g.insertVertex(vert, null, sub, sv.x, sv.y, sv.w, sv.h, sv.style);
						sv.__Vertex = sub;
					}
				}
			}
		} finally {
			m.endUpdate();
		}
	}

	const graphEditor = {
		template: '<div class="graph-canvas" ref="canvas"></div>',
		props: {
			model: Object
		},
		mounted: function () {
			console.dir('canvas mounted');
			let g = createGraph(this.$refs.canvas);
			fillGraph(g, this.model);
		}
	};

	Vue.component("a2-mxgraph-editor", graphEditor);
})();