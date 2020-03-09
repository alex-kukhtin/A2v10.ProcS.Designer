// Copyright © 2019-2020 Alex Kukhtin. All rights reserved

(function () {

	const MxEditorShapes = window.mxEditorShapes;
	const MxStencilRegistry = window.mxStencilRegistry;

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
