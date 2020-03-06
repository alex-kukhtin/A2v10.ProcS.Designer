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
