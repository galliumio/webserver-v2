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

"use strict";

// Binary data buffer writer.
class BufWriter {
    constructor(buf, off = 0, bigEndian = false) {
        this.buf = buf
        this.off = off
        this.error = false;
        this.bigEndian = bigEndian
    }
    valid() { return !this.error }
    getBuf() { return this.buf }
    writeUint8(value) {
        this.write(1, ()=>this.buf.writeUInt8(value, this.off))
    }
    writeUint16(value) {
        this.write(2, this.bigEndian ? ()=>this.buf.writeUInt16BE(value, this.off) : ()=>this.buf.writeUInt16LE(value, this.off))
    }
    writeUint32(value) {
        this.write(4, this.bigEndian ? ()=>this.buf.writeUInt32BE(value, this.off) : ()=>this.buf.writeUInt32LE(value, this.off))
    }
    writeFloat(value) {
        this.write(4, this.bigEndian ? ()=>this.buf.writeFloatBE(value, this.off) : ()=>this.buf.writeFloatLE(value, this.off))
    }
    writeDouble(value) {
        this.write(8, this.bigEndian ? ()=>this.buf.writeDoubleBE(value, this.off) : ()=>this.buf.writeDoubleLE(value, this.off))
    }
    // @return Length of str, not including padding.
    writeString(str, len) {
        this.write(len, ()=>{
            this.buf.write(str, this.off, len, 'utf8')
            // Pads with 0x00. There must be at least one space for 0x00.
            fw.assert(len > str.length)
            this.buf.fill(0, this.off + str.length, this.off + len)
        })
        return str.length
    }
    write(len, func) {
        if (this.error || ((this.off + len) > this.buf.length)) {
            this.error = true
            return
        }
        func()
        this.off += len 
    }
}

module.exports = {
    BufWriter
}

