/**
 * The Draft-76 WebSocket Transport Layer
 *
 * The main differeneces in implementation are:
 *
 *  1. Web Socket => WebSocket
 *  2. WebSocket-* => Sec-WebSocket-*
 *  3. Closing 0xFF byte frame
 *  4. Key based handshaking
 *
 * @link http://www.whatwg.org/specs/web-apps/current-work/complete/network.html
 *
 * @author  Oliver Morgan (oliver.morgan@kohark.com)
 * @license MIT
 */

var net         = require("net"),
    websocket75 = require("./websocket75").websocket75,
    Buffer      = Buffer = require("buffer").Buffer,
    Crypto      = require("crypto");

exports.accepts = function(request) {

    // Ensure the upgrade request header has a value of "WebSocket"
    return request.headers.upgrade == "WebSocket" &&
        "sec-websocket-key1" in request.headers &&
        "sec-websocket-key2" in request.headers;
}

exports.websocket76 = websocket75.extend({

    closing: false,

    handshake: function(request) {

        // Prepare a handshake
        var response = [
            "HTTP/1.1 101 WebSocket Protocol Handshake",
            "Upgrade: WebSocket",
            "Connection: Upgrade",
            "sec-WebSocket-Origin: " + request.headers.origin,
            "Sec-WebSocket-Location: " + this.location(request)
        ];

        // If we were given with a protocal, return it
        if ("sec-websocket-protocol" in request.headers) {
            response.push("Sec-WebSocket-Protocol: " + request.headers["sec-websocket-protocol"]);
        }

        // Add two empty lines before the response
        response.push("", "");

        // Extract the two websocket keys from the request
        var key1 = request.headers["sec-websocket-key1"],
            key2 = request.headers["sec-websocket-key2"];

        // Create a hash to take our response key
        var hash = crypto.createHash('md5');
        
        // Do exactly the same to both keys
        [key1, key2].forEach(function(key) {

            // Get the digits, number of spaces and an empty buffer
            var digits = parseInt(key.replace(/[^\d]/g, "")),
                spaces = key.replace(/[^ ]/g, '').length,
                buffer = new Buffer(4);

             // We need atleast 1 space and the spaces must be a multiple of the digits
             if (spaces === 0 || digits % spaces !== 0) {

                // The websocket handshake specification requires spaces
                return false;
             }

             // Divide the number by the number of spaces
             digits /= spaces;

             // Pack the key into a large-endian and add it to the hash
             hash.update(String.fromCharCode(
                digits >> 24 & 0xFF,
                digits >> 16 & 0xFF,
                digits >> 8  & 0xFF,
                digits       & 0xFF));
        });

        // Add the header to the hash
        hash.update(this.head.toString("binary"));

        // Combine the response header with the digested hash and send it to the client
        this.connection.write(response.join("\r\n") + hash.digest("binary"), "binary");

        // It worked
        return true;
    },

    destroy: function() {

        // Check if we are closing
        if ( ! this.closing) {

            // Write the closing handshake
            this.connection.write("\uffff", "binary");
            this.connection.write("\u0000", "binary");

            // End the stream
            this.connection.end();

            // Set the closing state
            this.closing = true;
        }
        else {
            
            // Finally destroy the stream
            this.connection.destroy();
        }
    }
});