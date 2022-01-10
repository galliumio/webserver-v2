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

"use strict";

// Binary data buffer reader.
// @param buf - A Node.js Buffer object.
// @param len - Length of data from the beginning of 'buf' available for the reader.
//              Default is 0 meaning  the entire buffer. This is to allow 'buf' to
//              contain more data than what is available for the reader.
// @param off - Offset from the beginning of 'buf' from which reading starts. 
//              Default is 0.
// @param bigEndian - Default is false.           
class BufReader {
    constructor(buf, len = 0, off = 0, bigEndian = false) {
        this.buf = buf
        this.len = (len == 0) ? buf.length : len
        this.off = off
        this.error = false;
        this.bigEndian = bigEndian
    }
    reset(off = 0) {
        this.off = off
        this.error = false
    }
    valid() {
        return !this.error
    }
    readUint8() {
        return this.read(1, ()=>this.buf.readUInt8(this.off))
    }
    readUint16() {
        return this.read(2, this.bigEndian ? ()=>this.buf.readUInt16BE(this.off) : ()=>this.buf.readUInt16LE(this.off))
    }
    readUint32() {
        return this.read(4, this.bigEndian ? ()=>this.buf.readUInt32BE(this.off) : ()=>this.buf.readUInt32LE(this.off))
    }
    readFloat() {
        return this.read(4, this.bigEndian ? ()=>this.buf.readFloatBE(this.off) : ()=>this.buf.readFloatLE(this.off))  
    }
    readDouble() {
        return this.read(8, this.bigEndian ? ()=>this.buf.readDoulbeBE(this.off) : ()=>this.buf.readDoubleLE(this.off))  
    }
    readString(len) {
        return this.read(len, ()=>this.buf.toString('utf8', this.off, this.off + len).replace(/\x00/g,''))
    }
    read(len, func) {
        if (this.error || ((this.off + len) > this.len)) {
            this.error = true
            return null
        }
        let result = func()
        this.off += len
        return result  
    }
}

// Usage examples.
/*
let buf = Buffer.allocUnsafe(32)
let writer = new BufWriter(buf, 0)
let strLen = writer.writeString('This is a test only', 24)
writer.writeUint8(strLen)
writer.writeUint16(strLen)
writer.writeUint32(strLen)
this.log('writer valid = ', writer.valid())
this.log('buf = ', buf.toString('hex'))
let reader = new BufReader(buf, 0)
let str = reader.readString(24)
let strlen0 = reader.readUint8()
let strlen1 = reader.readUint16()
let strlen2 = reader.readUint32()
this.log('reader valid = ', reader.valid())
if (reader.valid()) {
    this.log('str = ', str)
    this.log(`str len = ${strlen0} ${strlen1} ${strlen2}`)
}
*/

module.exports = {
    BufReader
}

