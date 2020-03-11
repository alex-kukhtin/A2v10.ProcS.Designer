(function () {

	const eventBus = require('std:eventBus');

	function updateGlobal() {
		eventBus.$emit('editor.update');
	}

	const FINAL_SIZE = {
		w: 50,
		h: 50
	};

	const ICONS = {
		start: '\ue97b'
	};

	const TRANSITION_SIZE = {
		height: 40,
		width: 180,
		padding: { top: 40, right: 20, bottom: 20, left: 20 },
		gapY: 10,
		calcStateHeight: function (cnt) {
			return cnt * this.height + this.gapY * (cnt - 1) + this.padding.top + this.padding.bottom;
		},
		calcStateWidth: function () {
			return this.width + this.padding.left + this.padding.right;
		},
		getTransitionBounds: function (ix) {
			let top = this.padding.top + ix * (this.height + this.gapY);
			return { x: this.padding.left, y: top, w: this.width, h: this.height };
		}
	};

	class Transition {
		constructor(name, trans, index) {
			Object.defineProperty(this, '__Vertex', { enumerable: false, value: null, writable: true });
			Object.defineProperty(this, '__Edge', { enumerable: false, value: null, writable: true });
			this.Name = name;
			this.To = '';
			this.Index = index;
			this.$edgePoints = [];
			if (trans) {
				this.To = trans.To;
				this.$edgePoints = trans.$edgePoints || [];
			}
		}

		get vertex() {
			let v = { style: 'condition', ...TRANSITION_SIZE.getTransitionBounds(this.Index) };
			return v;
		}

		setGeometry(gm) {
			if (!gm.points) return;
			this.EdgePoints = gm.points.map(p => ({ x: p.x, y: p.y }));
			console.dir(this.EdgePoints);
		}
	}

	class State {
		constructor(name, state) {
			Object.defineProperty(this, '__Vertex', { enumerable: false, value: null, writable: true });
			this.Name = name;
			this.$position = { x: 0, y: 0 };
			this.Final = true;
			this.NextState = '';
			this.Transitions = [];
			if (!state)
				return this;
			this.NextState = state.NextState;
			if (state.$position) {
				this.$position = {...state.$position };
			}
			if (state.Transitions) {
				for (let t in state.Transitions) {
					this.Transitions.push(new Transition(t, state.Transitions[t], this.Transitions.length));
				}
			}
			this.Final = state.final || (this.Transitions.length === 0 && !this.NextState);
		}

		get size() {
			return this.Final ?
				{ w: FINAL_SIZE.w, h: FINAL_SIZE.h } :
				{ w: TRANSITION_SIZE.calcStateWidth(), h: TRANSITION_SIZE.calcStateHeight(this.Transitions.length) };
		}

		get vertex() {
			let v = { ...this.$position, ...this.size, style: this.style };
			if (this.Final)
				v.icon = ICONS.start;
			if (this.Transitions) {
				v.vertices = [];
				for (let t of this.Transitions)
					v.vertices.push(t);
			}
			return v;
		}

		get style() {
			if (this.Final)
				return 'start';
			return 'state';
		}
		
		setGeometry(gm) {
			this.$position.x = gm.x;
			this.$position.y = gm.y;
		}

		getHeight() {
			return TRANSITION_SIZE.calcStateHeight(this.Transitions.length);
		}

		addTransition() {
			let ix = this.Transitions.length;
			var nt = new Transition('T' + (ix + 1), undefined, ix);
			this.Transitions.push(nt);
			this.$addTransitionToGraph(nt);
		}

		deleteTransition(tr) {
			/*
			var t = this.Transitions.indexOf(tr);
			this.Transitions.splice(t, 1);
			this.Transitions.forEach((t, ix) => t.Index = ix);
			this.$removeTransitionFromGraph(tr);
			*/
			this.$repaint();
		}
	}


	class StateMachine {
		constructor(model) {
			this.InitialState = model.InitialState;
			this.States = [new State("Start", {final:true, $position: { ...model.$initPosition } })];
			for (var state in model.States) {
				this.States.push(new State(state, model.States[state]));
			}
		}
	}


	const ctors = window.app.$Constructors;
	ctors.$State = State;
	ctors.StateMachine = StateMachine;

})();
(function () {

	const eventBus = require('std:eventBus');

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
		g.setDisconnectOnMove(false);

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

		function updateStateGeometry(state, withtrans) {
			let vertex = state.__Vertex;
			let geo = vertex.getGeometry().clone();
			geo.height = state.getHeight();
			vertex.setGeometry(geo);
			if (!withtrans)
				return;
			for (let tr of state.Transitions) {
				let tvertex = tr.__Vertex;
				let tv = tr.vertex;
				let tg = tvertex.getGeometry().clone();
				tg.x = tv.x;
				tg.y = tv.y;
				tg.width = tv.w;
				tg.height = tv.h;
				console.dir(tg);
				g.getModel().setGeometry(tvertex, tg);
			}
		}


		ctors.$State.prototype.$addTransitionToGraph = function (trns) {
			g.getModel().beginUpdate();
			try {
				let vertex = this.__Vertex;
				let tv = trns.vertex;
				let cond = g.insertVertex(vertex, null, trns, tv.x, tv.y, tv.w, tv.h, tv.style, false);
				trns.__Vertex = cond;
				updateStateGeometry(this, false);
			} finally {
				g.getModel().endUpdate();
			}
		};

		ctors.$State.prototype.$removeTransitionFromGraph = function (tr) {
			g.getModel().beginUpdate();
			try {
				let vertex = tr.__Vertex;
				g.removeCells([vertex], true);
				updateStateGeometry(this, true);
			} finally {
				g.getModel().endUpdate();
			}
		};

		ctors.$State.prototype.$repaint = function () {
			g.getModel().beginUpdate();
			try {
				console.dir('repaint');
				let vertex = this.__Vertex;
				console.dir(vertex);
				g.updateCellSize(vertex, true);
			} finally {
				g.getModel().endUpdate();
			}
		};

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
						sub.__Vertex = subVert;
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
(function () {

	const eventBus = require('std:eventBus');

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