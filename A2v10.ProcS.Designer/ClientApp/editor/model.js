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

		function createActivity(a) {
			var r = {};
			console.dir(a);
			let res = a.getAttribute('__res');
			if (res)
				r.$res = res;
			return r;
		}

		function addEntries(entry, activities) {
			if (!activities && !activities.length) return;
			let cnt = activities.length;
			if (cnt == 1) {

			} else {
				entry.OnEntry = {
					$res: "com.a2v10.procs:SequenceActivity",
					Activities: []
				}
				let target = entry.OnEntry.Activities;
				for (let a of activities) {
					target.push(createActivity(a.node));
				}
			}
		}

		function createState(v) {
			let state = {
				$shape: v.type,
				$position: getPosition(v.node),
				Name: v.node.getAttribute("Name")
			};
			if (v.entry) {
				let entries = model.a.filter(x => x.parent === v.entry.id);
				addEntries(state, entries);
			}
			if (v.transitions) {
				state.Transitions = {};
				for (let t in v.transitions) {
					let tr = v.transitions[t];
					state.Transitions[tr.id] = createTransition(tr);
				}
			}
			if (v.edge) {
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
			v: {}, e: [], a:[]
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
			} else {
				cells.a.push(v);
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
