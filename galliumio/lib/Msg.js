/*******************************************************************************
 * Copyright (C) 2018 Gallium Studio LLC (Lawrence Lo). All rights reserved.
 *
 * This program is open source software: you can redistribute it and/or
 * modify it under the terms of the GNU General Public License as published
 * by the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 * 
 * Alternatively, this program may be distributed and modified under the
 * terms of Gallium Studio LLC commercial licenses, which expressly supersede
 * the GNU General Public License and are specifically designed for licensees
 * interested in retaining the proprietary status of their code.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program. If not, see <http://www.gnu.org/licenses/>.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
 * AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
 * IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
 * DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE
 * FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL
 * DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR
 * SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER
 * CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY,
 * OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
 * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 * 
 * Contact information:
 * Website - https://www.galliumstudio.com
 * Source repository - https://github.com/galliumstudio
 * Email - admin@galliumstudio.com
 ******************************************************************************/

let {fw, FW} = require("./Fw.js")
let {Evt, ErrorEvt} = require("./Evt.js")
let {BufWriter} = require("./BufWriter.js")
let {BufReader} = require("./BufReader.js")
"use strict";

// Base class of all messages (aka external events) in the system.
// Add further members required for messages.
class Msg extends Evt {
    constructor(type = FW.UNDEF, to = FW.UNDEF, from = FW.UNDEF, seq = 0) {
        super(type, to, from, seq)
        this.len = 0        // Placeholder to be filled in in Msg.createBuffer()
                            // This field is ONLY used in binary message format, i.e. generated via Evt.createBuffer().
                            // This field remains at 0 for JSON message format and is NOT present in command line format (args).
    }
    // Binary format.
    /* 
        uint32_t len
    */
    bufferSize() { return super.bufferSize() + 4 }
    fromBuffer(reader) {
        super.fromBuffer(reader)
        this.len = reader.readUint32()
    }
    toBuffer(writer) {
        super.toBuffer(writer)
        writer.writeUint32(this.len)
    }
    fromCmdArgs(args) {
        // Field 'len' is not present in command line arguments.
        // Note - We can omit this function and rely on the one inherited from Evt.
        return super.fromCmdArgs(args);
    }
    toCmdArgs() {
        let args = super.toCmdArgs()
        // Nothing to add.
        return args
    }
    // Note - createBuffer() may be called on an object derived from Evt.
    createBuffer() {
        this.len = this.bufferSize()
        let writer = new BufWriter(Buffer.allocUnsafe(this.len))
        this.toBuffer(writer)
        fw.assert(writer.valid())
        return writer.getBuf()
    } 
    // @param msgCtor - Message constructor.
    // @param buffer - Buffer object containing binary data from which a message is built.
    //                 It must contain the minimum no. of bytes required for building this message, but it may
    //                 contain more data, e.g. part or whole of next message(s).
    // @param msgLen - Length of message contained in buffer. It must be <= buffer length.
    static createMessage(MsgCtor, buffer, msgLen) {
        fw.assert(typeof MsgCtor == 'function')
        fw.assert(buffer && buffer.length >= msgLen)
        let msg = new MsgCtor
        let reader = new BufReader(buffer, msgLen)
        msg.fromBuffer(reader)
        if (!reader.valid()) {
            msg = null
        }
        return msg
    }
    // @param msgCtor - Message constructor.
    // @param jsonMsg - A message object parsed from a json message received from ws or tcp.
    // @remark jsonMsg does NOT include any methods inherited from the prototype of MsgCtor.
    //         Therefore it uses Ojbect.assign() to copy it over to a default MsgCtor instance.
    static createMessageFromJson(MsgCtor, jsonMsg) {
        fw.assert(typeof MsgCtor == 'function')
        let msg = new MsgCtor
        fw.assert(jsonMsg && (jsonMsg.type == msg.type))
        // We cannot use {...msg, ...jsonMsg} which strips away the inherited methods from MsgCtor.
        Object.assign(msg, jsonMsg)
        return msg
    }
    // @param msgCtor - Message constructor.
    // @param args - A array of argument strings received from tcp. args[0] is the message type.
    static createMessageFromCmdArgs(MsgCtor, args) {
        fw.assert(typeof MsgCtor == 'function')
        fw.assert(Array.isArray(args))
        let msg = new MsgCtor
        if (!msg.fromCmdArgs(args)) {
            // Failed to convert. Set msg to null for returning.
            msg = null
        }
        return msg
    }
}

// Error or status messages.
class ErrorMsg extends Msg {
    constructor(type = FW.UNDEF, to = FW.UNDEF, from = FW.UNDEF, seq = 0, error = FW.ERROR_SUCCESS, origin = FW.UNDEF, reason = FW.REASON_UNSPEC) {
        super(type, to, from, seq)
        this.error = error
        this.origin = origin
        this.reason = reason
    }
    // Binary format (48 bytes).
    /*
        char error[16]
        char origin[16] 
        char reason[16]
    */
   bufferSize() { return super.bufferSize() + FW.EVT_ERROR_LEN + FW.ID_LEN + FW.EVT_REASON_LEN }
   fromBuffer(reader) {
       super.fromBuffer(reader)
       this.error = reader.readString(FW.EVT_ERROR_LEN)
       this.origin = reader.readString(FW.ID_LEN)
       this.reason = reader.readString(FW.EVT_REASON_LEN)
   }
   toBuffer(writer) {
       super.toBuffer(writer)        
       writer.writeString(this.error, FW.EVT_ERROR_LEN)
       writer.writeString(this.origin, FW.ID_LEN)
       writer.writeString(this.reason, FW.EVT_REASON_LEN)
   }   
   fromCmdArgs(args) {
        if (super.fromCmdArgs(args) && (args.length >= 3)) {
            this.error = args.shift()
            this.origin = args.shift()
            this.reason = args.shift()
            return true
        }
        return false
    }
    toCmdArgs() {
        let args = super.toCmdArgs()
        args.push(this.error)
        args.push(this.origin)
        args.push(this.reason)
        return args
    }
}

module.exports = {
   Msg,
   ErrorMsg
}

