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
