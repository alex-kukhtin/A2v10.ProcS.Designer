

(function () {

	let modules = {};
	window.app = {
		modules
	};

	window.require = function (name) {
		if (!(name in modules))
			throw new Error(`module '${name}' not found`);
		let am = modules[name];
		if (typeof am === 'function') {
			am = am(); // always singleton
			app.modules[module] = am;
		}
		return am;
	};

	window.module = function (name, factory) {
		if (name in modules)
			throw new Error(`module '${name}' already defined`);
		modules[name] = {
			factory,
			module: null
		};
	};

	modules["std:eventBus"] = new Vue();
})();