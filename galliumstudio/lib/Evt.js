/*******************************************************************************
 * Copyright (C) Gallium Studio LLC. All rights reserved.
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
let {BufWriter} = require("./BufWriter.js")
let {BufReader} = require("./BufReader.js")

"use strict";

// Base class of all events in the system.
// Binary format (72 bytes).
/*
    char type[38]   // Role(16) ServicePrimitive(22)
    char to[16]     
    char from[16]   
    uint16_t seq
*/
class Evt {
    constructor(type = FW.UNDEF, to = FW.UNDEF, from = FW.UNDEF, seq = 0) {
        this.type = type
        this.to = to
        this.from = from
        this.seq = seq
    }
    bufferSize() { return FW.EVT_TYPE_LEN + FW.ID_LEN + FW.ID_LEN + 2 }
    fromBuffer(reader) {
        this.type = reader.readString(FW.EVT_TYPE_LEN)
        this.to = reader.readString(FW.ID_LEN)
        this.from = reader.readString(FW.ID_LEN)
        this.seq = reader.readUint16()
    }
    toBuffer(writer) {
        writer.writeString(this.type, FW.EVT_TYPE_LEN)
        writer.writeString(this.to, FW.ID_LEN)
        writer.writeString(this.from, FW.ID_LEN)
        writer.writeUint16(this.seq)
    }
    fromCmdArgs(args) {
        if (args.length >= 4) {
            this.type = args.shift()
            this.to = args.shift()
            this.from = args.shift()
            this.seq = parseInt(args.shift())
            return true
        }
        return false
    }
    toCmdArgs() {
        let args = []
        args.push(this.type)
        args.push(this.to)
        args.push(this.from)
        args.push(this.seq.toString())
        return args
    }
}

// Error or status events.
class ErrorEvt extends Evt {
    constructor(type = FW.UNDEF, to = FW.UNDEF, from = FW.UNDEF, seq = 0, error = FW.ERROR_SUCCESS, origin = FW.UNDEF, reason = FW.REASON_UNSPEC) {
        super(type, to, from, seq)
        this.error = error
        this.origin = origin
        this.reason = reason
    }
}

module.exports = {
   Evt,
   ErrorEvt
}

