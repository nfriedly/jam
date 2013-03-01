deifne([], function() {
	var passed = false;
	return {
		name: 'Package plugin',
		load: function (name, parentRequire, onload, config) {
			console.log('load called with ', arguments);
			// this is defined in integration/fixtures/project-extraconfig/package.json
			// we can't use nodeunit's test.ok() because we're in a different process
			passed = !!config['package-plugin'];
			req([name], function (value) {
				onload(value);
			});
		},
		write: function (pluginName, moduleName, write) {
			console.log('write called with ', arguments);
			// note: be careful to not write the exact string we're looking for here
			write("define('" + pluginName + "!" + moduleName  +
				  "', function () { return 'package-plugin-" + (passed ? "success" : "failure") + "';});\n");
		}
	}
});
