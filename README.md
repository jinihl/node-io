# Node-IO

Many thanks to guille and his work on LearnBoost's Socket.IO-node, many of the ideas came from them.

_License:_ MIT
_Author:_ Oliver Morgan (oliver.morgan@kohark.co.uk)
_Thanks To:_ Guillermo Rauch (http://devthought.com)

_Current transport drivers:_

* Draft-75 WebSockets
* Draft-76 WebSockets

_Planned drivers:_

* Direct TCP
* Forever iFrame
* Long Polling
* Any other that's required to be portable

## Features

* _Unique Client IDs_
I have a big problem with all existing server implementations in that they use a random number generator to assign IDs to new clients. What if you generate the same ID for two people? Well just increase the size of the random number produced... Why waste the memory?

Node-IO solves this by containing a limitable array of clients which are assigned a unique id. When a client disconnects, its id is reused for another connection. This implementation only works if its assumed that the connection is persistent (which it is).

* _Well Annotated Clean Code_
I have done my best to annotate all the code, i had a nightmare trying to understand other people's code with no comments at all! I hope this will make it easier for people trying to use and maintain my code.

* _Up-to-date WebSocket driver_
There are so so many WebSocket drivers that have been released for Node.JS. I have seen 99% of them, and NONE of them support the latest Draft-76 specification fully. I have done my best to cover every aspect of the specification, and will continue to do so.

* _Effective Message Queue_
All messages are queued before being sent, only when the transport layer signals that its ready will a new message be sent. Seeing as most of the drivers will require this functionality by default, its a very useful feature to have.

* _Universal Pause/Resume_
All streams support pausing and resuming using the message queue to buffer messages until the stream is resumed.

## Why Node-IO is different from Socket.IO-node

I build Node-IO because i needed a clean and up-to-date networking server that would work with not only browsers, but other TCP clients too. The problem i had with Socket.IO is that it required the use of its own client side library, and although i will provide a client side library to work with Node-IO (eventually!), it wont require it. Its websocket transport layer is also out-of-date and disfunctional.

## Docs & Examples

### Basic use

	var Server = require("lib/net/server").server;
	var sys = require("sys");

	// Create a new server set to listen on port 8124
	var myServer = new Server(8124);

	// Bind the server to the port and listen out for incoming connections

	myServer.listen(function(client) {

		// On a successful connection and handshake we have a connected client!
		// Listen out for incoming messages from the client
		client.addListener("message", function(message) {

			// We have received a message from a client!
			sys.puts("Message received from client #" + client.id + ");

			// Post the message
			sys.puts(message);

			// Broadcast another message to the whole server
			myServer.broadcast("My message to everyone connected!");
		});
	});

### Using Configuration Files

Coming Soon!

### Authorizing Clients

Coming Soon!

### Pausing / Resuming Client Streams

Coming Soon!


