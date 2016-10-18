// TeamSpeak (3) Server Status
// https://github.com/5G5/teamspeak-status
// LICENSE MIT (https://github.com/5G5/teamspeak-status/blob/master/LICENSE)


var config = require("./config");
var TeamSpeakClient = require("node-teamspeak");

// ConnectStart
var client = new TeamSpeakClient(config.serverHost, config.serverPort), servername = "";

// Join
client.send("login", {
	client_login_name: config.loginName,
	client_login_password: config.loginPass
}, function (err, response, rawResponse) {
	if (err) { console.log("An error occured while connecting to the server at '" + config.serverHost + ":" + config.serverPort + "':", err); process.exit(1); return; }

	// Get Virtual Server info
	client.send("serverlist", { sid: config.serverVirt }, function (err, response, rawResponse) {
		if (err) { console.log("An error occured while connecting to the virtual server #" + config.serverVirt + ":", err); process.exit(1); return; }
		if (!Array.isArray(response)) response = [response];

		for (var i = 0; i < response.length; i++)
			if (response[i].virtualserver_id == config.serverVirt) servername = response[i].virtualserver_name;
	});

	// Select Virtual Server
	client.send("use", { sid: config.serverVirt }, function (err, response, rawResponse) {
		if (err) { console.log("An error occured while connecting to the virtual server #" + config.serverVirt + ":", err); process.exit(1); return; }
		statusLoop();
	});
});

// updat user list
var hostinfo, channels = {}, users = {};

function statusLoop() {
	// 0: Hostinfo
	client.send("hostinfo", function (err, response, rawResponse) {
		if (err) return error(err);

		hostinfo = response;
		// 1: LIST CHANNELS
		client.send("channellist", ["topic"], function (err, response, rawResponse) {
			if (err) return error(err);
			if (!Array.isArray(response)) response = [response];

			var cn = {};
			// Add all channels to cn
			for (var i = 0; i < response.length; i++) {
				cn[response[i].cid] = {
					name: response[i].channel_name,
					topic: response[i].channel_topic,
					parent: response[i].pid,
					order: response[i].channel_order,
					children: []
				};
			}

			// Move children to their parent channel
			var children = [];
			for (i in cn) if (cn.hasOwnProperty(i) && cn[i].parent != 0) // Link children
				cn[cn[i].parent].children.push(i);
			for (i in cn) if (cn.hasOwnProperty(i) && cn[i].children.length != 0) // Write children
				cn[i].children = resolveChildren(cn, cn[i].children);

			channels = cn; // Update channels to new value.

			// 2: get all users
			client.send("clientlist", ["voice"], function (err, response, rawResponse) {
				if (err) return error(err);
				if (!Array.isArray(response)) response = [response];

				var un = {};
				// Add all users (by channel) to un.
				for (var i = 0; i < response.length; i++) if (response[i].client_type == 0) {
					if (un[response[i].cid] == undefined) un[response[i].cid] = [];
					un[response[i].cid].push({
						clid: response[i].clid,
						name: response[i].client_nickname,
						talking: response[i].client_flag_talking != 0,
						muted: (response[i].client_input_muted + response[i].client_output_muted + 1 - response[i].client_input_hardware + 1 - response[i].client_output_hardware) > 0,
						talkpower: response[i].client_talk_power
					});
				}

				for (i in un) un[i].sort(function (a, b) {
					if (a.talkpower != b.talkpower) return a.talkpower > b.talkpower ? -1 : 1;
					else return String.prototype.localeCompare(a, b);
				});
				users = un; // Update users to new value.

				// debugOutput(channels, 0);
				// process.exit(0);
				setTimeout(statusLoop, 200);
			});
		});
	});
}

function clone(obj) { return JSON.parse(JSON.stringify(obj)); }
function error(err) {
	console.log("An error occured:", err);
	process.exit(1);
	return null;
}

function resolveChildren(channels, children) {
	var childrenResolved = {};
	for (i in children) if (children.hasOwnProperty(i) && parseInt(children[i]) != NaN) {
		var childID = children[i];
		channels[childID].children = resolveChildren(channels, channels[childID].children);
		childrenResolved[childID] = channels[childID];
		delete channels[childID];
	}
	return childrenResolved;
}

function getOrder(channels) {
	var unordered = {};
	for (i in channels) if (channels.hasOwnProperty(i)) {
		unordered[i] = channels[i].order; // i: channel ID, channels[i].order: last channel
	}
	// Add next item piece by piece
	var ordered = []; var current = 0;
	for (i in unordered) if (unordered.hasOwnProperty(i)) {
		ordered.push(getOrderNext(current, unordered));
		current = ordered[ordered.length - 1];
	}
	return ordered;
}
function getOrderNext(current, list) {
	for (i in list) if (list[i] == current) return i;
}


// Channel Tree
// Channel Tree as JSON
function outputChannelJSONC(channels) {
	var output = [];
	var o = getOrder(channels);
	for (var i = 0; i < o.length; i++) { // For all channels
		var n = output.push({
			name: channels[o[i]].name,
			users: [],
			subchannels: []
		}) - 1; // Print channel name
		if (users[o[i]] != undefined) for (var j = 0; j < users[o[i]].length; j++) // Print users in channel
			output[n].users.push({
				name: users[o[i]][j].name,
				talking: users[o[i]][j].talking,
				muted: users[o[i]][j].muted
			});
		output[n].subchannels = outputChannelJSONC(channels[o[i]].children);
	}
	return output;
}
function outputChannelJSON() {
	return JSON.stringify({
		name: servername,
		users: [],
		subchannels: outputChannelJSONC(channels)
	});
}
function outputUserCounter() {
	return JSON.stringify({
		useronline: hostinfo.virtualservers_total_clients_online,
		totaluser: hostinfo.virtualservers_total_maxclients
	});
}
function outputTrafficCounter() {
	return JSON.stringify({
		filetransfer_bandwidth_sent: hostinfo.connection_filetransfer_bandwidth_sent,
		filetransfer_bandwidth_received: hostinfo.connection_filetransfer_bandwidth_received,
		filetransfer_bytes_sent_total: hostinfo.connection_filetransfer_bytes_sent_total,
		filetransfer_bytes_received_total: hostinfo.connection_filetransfer_bytes_received_total,
		packets_sent_total: hostinfo.connection_packets_sent_total,
		bytes_sent_total: hostinfo.connection_bytes_sent_total,
		packets_received_total: hostinfo.connection_packets_received_total,
		bytes_received_total: hostinfo.connection_bytes_received_total,
		bandwidth_sent_last_second_total: hostinfo.connection_bandwidth_sent_last_second_total,
		bandwidth_sent_last_minute_total: hostinfo.connection_bandwidth_sent_last_minute_total,
		bandwidth_received_last_second_total: hostinfo.connection_bandwidth_received_last_second_total,
		bandwidth_received_last_minute_total: hostinfo.connection_bandwidth_received_last_minute_total
	});
}

// Webserver

var fs = require("fs"); var path = require("path");
var express = require("express");
var app = express();

app.get('/api/tree', function (req, res) {
	res.type("application/json").send(outputChannelJSON());
});
app.get('/api/servername', function (req, res) {
	res.type("application/json").send(servername);
});
app.get('/api/hostinfo', function (req, res) {
	res.type("application/json").send(hostinfo);
});
app.get('/api/usercounter', function (req, res) {
	res.type("application/json").send(outputUserCounter());
});
app.get('/api/trafficcounter', function (req, res) {
	res.type("application/json").send(outputTrafficCounter());
});
// Simple string response
app.get('/api/simple/useronline', function (req, res) {
	res.type("application/json").send(JSON.stringify(hostinfo.virtualservers_total_clients_online));
});
app.get('/api/simple/maxclients', function (req, res) {
	res.type("application/json").send(JSON.stringify(hostinfo.virtualservers_total_maxclients));
});


app.use(function (req, res) {
	if (req.path.match('^(?:[a-zA-Z0-9-_/]*\.?)*$')) {
		res.redirect(301, config.webError);
	} else res.status(404).end();
});

var server = app.listen(config.webPort, config.webHost, function () {
	var host = server.address().address;
	var port = server.address().port;
	console.log('Webserver listening at http://%s:%s', host, port);
});
