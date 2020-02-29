
(function () {

	const eventBus = window.app.$EventBus;

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