var templates = {};


$(window).load(function() {
	
	var temps = $("template").toArray();
	for (var i in temps) {
		templates[temps[i].getAttribute("name")] = temps[i].innerHTML;
	}

	document.body.innerHTML = templates["load_screen"]

	chrome.runtime.sendMessage({command: "connect", args: []}, function(res) {
		console.log(arguments)
		console.log("why!!!");
		if (res.result) {
			console.log("Active!");
		} else {
			console.log("Inactive");
		}
	})
})
