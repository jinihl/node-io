/**
 * The Draft-75 WebSocket Transport Layer
 *
 * This is the base class for the WebSocket transport layer.
 * Due to the inconsistencies of the websocket drafts, it was necessary to spit them.
 *
 * @author  Oliver Morgan (oliver.morgan@kohark.com)
 * @license MIT
 */

var net    = require("net"),
    sys    = require("sys");

exports.accepts = function(request) {

    // Ensure the upgrade request header has a value of "WebSocket"
    return request.headers.upgrade == "WebSocket" && ! (
        "sec-websocket-key1" in request.headers &&
        "sec-websocket-key2" in request.headers);
}

exports.websocket75 = new Class({

    connected: false,
    buffer:    [],

    constructor: function(request, response, server, head) {

        // Save the server property
        this.server = server;

        // The stream is the response stream
        this.connection = response;

        // Set the remoteAddress property
        this.remoteAddress = this.connection.remoteAddress;

        // Set the HTTP upgrade head
        this.head = head;

        server.log("Websocket initializing stream options");

        // Set some options based on the socket options
        this.connection.setTimeout(0);
        this.connection.setNoDelay(true);
        this.connection.setEncoding("binary");

        // Expose the current object
        var self = this;

        // Listen out for the stream closing
        this.connection.addListener("close", function() {

            // The socket is no longer connected
            self.connected = false;
            
            // Empty the buffer
            self.buffer = [];

            // Re-emit the event
            self.emit("disconnect");
        });

        // Listen to the end event
        this.connection.addListener("end", function() {

            // Destroy the socket
            self.destroy();
        });

        // Listen out for data received
        this.connection.addListener("data", this.payload);

        // Handshake the request
        if (this.handshake(request)) {

            server.log("Websocket handshake complete. Listing for data...");

            // In theory we should now be connected
            this.connected = true;
        }
        else {

            // Emit the handshake failure event
            this.emit("error", "Websocket handshake failed.");

            // If the handshake failed, close the stream
            this.stream.destroy();
        }
    },

    payload: function(data) {

        // Add the data to a buffer
        this.buffer += data.toString("binary");

        // Split the buffer by the ending deliminer
        var chunks = this.buffer.split("\ufffd");

        // Count and ignore the final empty chunk
        var count = chunks.length - 1;

        // Loop through each cunk
        for(var i = 0; i < count; i++) {

            // Get the chunk by index
            var chunk = chunks[i];

            // If the chunk starts with a starting deliminer
            if (chunk[0] == "\u0000") {

                // We have a full valid message to send!
                this.emit("message", chunk.slice(1));
            }
            else {

                // Destroy the stream
                this.stream.destroy();

                // Nothing more we can do
                return;
            }
        }

        // Set the buffer to the final chunk
        this.buffer = chunks[count];
    },

    location: function(request) {

        // Return the host and url with the ws:// prefix
        return  "ws://" + request.headers.host + request.url;
    },

    handshake: function(request) {

        // Prepare a handshake
        var headers = [
            "HTTP/1.1 101 Web Socket Protocol Handshake",
            "Upgrade: WebSocket",
            "Connection: Upgrade",
            "WebSocket-Origin: " + request.origin ? request.origin : "null",
            "WebSocket-Location: ws://" + this.location(request)
        ];

        // Write the headers
        this.write(headers.concat("", "").join("\r\n"));

        // Nothing can go wrong!
        return true;
    },
    
    write: function(message, encoding) {

        // Attempt to send the message
        try {

            // Write the starting deliminer
            this.connection.write("\u0000", "binary");

            // Write the message buffer
            this.connection.write(message, encoding);

            // Write the ending deliminer
            this.connection.write("\uffff", "binary");

            // Emit the drain event
            this.emit("drain");
        }
        catch(e) {

            // Close the stream 
            this.connection.destroy();

            // Emit the error event
            this.emit("error", e.message);
        }
    },
    
    destroy: function() {

        // Destroy the stream immediately
        this.connection.destroy();
    }
    
}).include(require("events").EventEmitter.prototype);