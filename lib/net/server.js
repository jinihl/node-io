var http   = require("http");
    sys    = require("sys");
    Class  = require("../util/class").Class;
    
exports.server = new Class({

    transports:  [
        "websocket75",
        "websocket76"
    ],
    
    clients:  [],
    port:     8080,
    capacity: -1,

    log: function(message) {

        // Write the message to the system log
        sys.log(message);
    },

    constructor: function(port, host) {

        // If a port was given
        if (port != undefined) {

            // Set the port value
            this.port = port;
        }

        // If a host was given
        if (host != undefined) {

            // Set the host value
            this.host = host;
        }
    },

    listen: function(connect) {

        // Expose the current object
        var self = this;

        // Add the connect callback as a listener
        this.addListener("connect", connect);

        // Listen out for requests on the server
        this.connection = http.createServer();

        // Look out for http requests for web methods
        this.connection.addListener("request", function(request, response) {

            self.log("HTTP request received from [" + request.connection.remoteAddress + "]");

            // Handles the connection
            self.handle(request, response);
        });

        // The upgrade header listens for incoming websocket connections
        this.connection.addListener("upgrade", function(request, socket, head) {

            self.log("HTTP updgrade request received from [" + socket.remoteAddress + "]");

            // Handles the connection
            self.handle(request, socket, head);
        });

        // Listen on the given port and host
        this.connection.listen(this.port, this.host);

        this.log("Server listing at host [" + this.host + "] on port [" + this.port + "]");
    },

    handle: function(request, response, head) {

        // Prepare some variables
        var stream = null;
            self   = this;

        // Loop through each transport
        for (var i in this.transports) {

            // Get the transport name
            var name = this.transports[i];

            // Fetch the socket class
            var transport = require("./transports/" + name);

            // If the socket accepts the request
            if (transport.accepts(request)) {

                this.log("Request handled with stream [" + name + "]");

                // Instantiate it with the request and response objects
                stream = new transport[name](request, response, this, head);

                // We only need 1 stream!
                break;
            }
        }

        // If no valid stream was found
        if (stream === null) {

            // The UI should not allow this to happen
            throw new Error("The user connected with an invalid stream.");
        }

        // Get the id of the connecting client
        var id = this.clients.length;

        // Check if the server is at maximum capactiy
        if (this.capacity > 0 && this.capacity < id) {

            // Destroy the stream
            stream.destroy();

            // The UI should not allow this
            throw new Error("User attempted to join lobby at full capacity.");
        }

        // Ensure the stream is connected
        if (stream.connected) {

            this.log("Request stream connected [" + name + "]");

            // Get the client class
            var client = require("./client").client;

            // Instantiate the client with the socket
            client = new client(stream);

            // Set the client identification
            client.id = id;

            this.log("Client assigned id [" + id + "]");

            // Add the client to the connection pool at the given id
            this.clients[id] = client;

            // Emit a client connect event
            this.emit("connect", client);

            // Expose the current object
            var self = this;

            // Add a listener to the socket close event
            client.addListener("disconnect", function() {
                
                self.log("Client dissconected with id [" + client.id + "]");
                
                // Remove the client from the pool
                self.clients.splice(client.id, 1);

                // Emit a client disconnect event
                self.emit("disconnect", client);
            });
        }
        else {

            // Destroy the stream
            stream.destroy();
        }
    },

    broadcast: function(message, encoding) {

        // Loop through each client
        for (client in this.clients) {

            // Send the message to each client
            client.send(message, encoding);
        }
    },

    client: function(id) {

        // Returnt the client at the given index
        return this.clients[id];
    }
    
}).include(require("events").EventEmitter.prototype);