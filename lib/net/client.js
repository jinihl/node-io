/**
 * The Client Class
 *
 * This class manages incoming client connections and
 * provides an abstraction to the underlying socket
 * transport layer.
 *
 * @author  Oliver Morgan (oliver.morgan@kohark.com)
 * @license MIT
 */

var Class = require("../util/class").Class;

exports.client = new Class({

    authenticated: true,
    paused:        false,
    queue:         [],

    constructor: function(stream) {

        // Set the stream property
        this.stream = stream;

        // Expose the current object
        var self = this;
        
        // Listen to the stream's ready event
        this.stream.addListener("drain", function() {

            // If there is an item on the buffer
            if (self.queue.length > 0) {

                // Shift off the first element and send it
                self.send(self.queue.shift());
            }
        });

        // Listen to the stream disconnect evetn
        this.stream.addListener("disconnect", function() {

            // Reset the message queue
            self.queue = [];

            // Re-emit the disconnect event
            self.emit("disconnect");
        });
    },

    pause: function() {

        // Set the paused property to true
        this.paused = true;
    },

    resume: function() {

        // Emit the ready function
        this.emit("drain");
    },

    send: function(message) {

        // Check if the stream is connected
        if (this.stream.connected && this.authenticated) {

            // Check if the stream is ready
            if (this.stream.ready && ! this.paused) {

                // Write the message to the stream
                this.write(message);
            }
            else {

                // Append the message to the buffer
                this.queue.push(message);
            }
        }
    }
    
}).include(require("events").EventEmitter.prototype);