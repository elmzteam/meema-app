
(function() {

	chrome.runtime.sendMessage({command: "connect", args: []}, function(res) {
		console.log(arguments)
		console.log("why!!!");
		if (res.result) {
			console.log("Active!");
		} else {
			console.log("Inactive");
		}
	})
})()
