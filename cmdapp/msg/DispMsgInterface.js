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

let {FW, fw, Msg, ErrorMsg, BufWriter} = require("../../galliumio/lib/index.js")

// Message interface for the "Disp (Display)" role.

// Display ticker. Index (0-based) specifies which buffer to use.
// Binary format.
/* 
    char text[200];
    uint32_t fgColor;   // Foreground color (888 xBGR - little-endian RGB)
    uint32_t bgColor;   // Background color (888 xBGR - little-endian RGB)
    uint16_t index;
*/
const TICKER_LEN = 200
class DispTickerReqMsg extends Msg {
    // @todo Change default 'data' to null (See SensorMsgInterface.js)
    constructor(data = {}, index = 0) {
        const {text, fgColor, bgColor} = data
        super('DispTickerReqMsg')
        this.text = text || ''
        this.fgColor = colorToUint32(fgColor)
        this.bgColor = colorToUint32(bgColor)
        this.index = index
    }
    bufferSize() { return super.bufferSize() + TICKER_LEN + 4 + 4 + 2 }
    fromBuffer(reader) {
        super.fromBuffer(reader)
        this.text = reader.readString(TICKER_LEN)
        this.fgColor = reader.readUint32()
        this.bgColor = reader.readUint32()
        this.index = read.readUint16()
    }
    toBuffer(writer) {
        super.toBuffer(writer)
        writer.writeString(this.text, TICKER_LEN)
        writer.writeUint32(this.fgColor)
        writer.writeUint32(this.bgColor)
        writer.writeUint16(this.index)
    }     
    fromCmdArgs(args) {
        if (super.fromCmdArgs(args) && (args.length >= 4)) {
            this.text = args.shift()
            this.fgColor = parseInt(args.shift())
            this.bgCoor = parseInt(args.shift())
            this.index = parseInt(args.shift())
            return true
        }
        return false
    }          
    toCmdArgs() {
        let args = super.toCmdArgs()
        args.push(this.text)
        args.push(this.fgColor.toString())
        args.push(this.bgColor.toString())
        args.push(this.index.toString())
        return args
    }                                                                    
}

class DispTickerCfmMsg extends ErrorMsg {
    constructor(error = FW.ERROR_SUCCESS, origin = FW.UNDEF, reason = FW.REASON_UNSPEC) {
        super('DispTickerCfmMsg', FW.UNDEF, FW.UNDEF, 0, error, origin, reason)
    }
}


// Helper function.
function colorToUint32(c) {
    // Note c.r etc are strings, and therefore it needs to use parseInt to convert them to numbers.
    return (c) ? parseInt(c.r) + (parseInt(c.g) << 8) + (parseInt(c.b) << 16) : 0
}

module.exports = {
    DispTickerReqMsg,
    DispTickerCfmMsg,
    TICKER_LEN,
}