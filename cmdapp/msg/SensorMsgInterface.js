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

let {FW, fw, Msg, ErrorMsg, BufWriter} = require("../../galliumstudio/lib/index.js")

// Message interface for the "Disp (Display)" role.

// Sensor control request.
// Binary format.
/* 
    float pitchThres;  // Pitch alarm threshold in degree.
    float rollThres;   // Roll alarm threshold in degree.
*/
class SensorControlReqMsg extends Msg {
    constructor(data = null, index = 0) {
        super('SensorControlReqMsg')
        if (data) {
            const {threshold} = data
            this.pitchThres = stringToFloat(threshold.pitch)
            this.rollThres = stringToFloat(threshold.roll)
        } else {
            this.pitchThres = 0
            this.rollThres = 0   
        }
    }
    bufferSize() { return super.bufferSize() + 4 + 4 }
    fromBuffer(reader) {
        super.fromBuffer(reader)
        this.pitchThes = reader.readFloat()
        this.rollThres = reader.readFloat()
    }
    toBuffer(writer) {
        super.toBuffer(writer)
        writer.writeFloat(this.pitchThres)
        writer.writeFloat(this.rollThres)
    }  
    fromCmdArgs(args) {
        if (super.fromCmdArgs(args) && args.length >= 2) {
            let pitchThres = parseFloat(args.shift())
            let rollThres = parseFloat(args.shift())
            if (!Number.isNaN(pitchThres) && !Number.isNaN(rollThres)) {
                this.pitchThres = pitchThres
                this.rollThres = rollThres
                return true
            }
        }
        return false
    }  
    toCmdArgs() {
        let args = super.toCmdArgs()
        args.push(this.pitchThres.toString())
        args.push(this.rollThres.toString())
        return args
    }                                                                        
}

class SensorControlCfmMsg extends ErrorMsg {
    constructor(error = FW.ERROR_SUCCESS, origin = FW.UNDEF, reason = FW.REASON_UNSPEC) {
        super('SensorControlCfmMsg', FW.UNDEF, FW.UNDEF, 0, error, origin, reason)
    }
}

// Sensor data indication.
// Binary format.
/* 
    float pitch;  // Pitch angle in degree.
    float roll;   // Roll angle in degree.
*/
class SensorDataIndMsg extends Msg {
    constructor(data = null, index = 0) {
        super('SensorDataIndMsg')
        if (data) {
            const {pitch, roll} = data
            this.pitch = pitch
            this.roll = roll
        } else {
            this.pitch = 0
            this.roll = 0
        }
    }
    bufferSize() { return super.bufferSize() + 4 + 4 }
    fromBuffer(reader) {
        super.fromBuffer(reader)
        this.pitch = reader.readFloat()
        this.roll = reader.readFloat()
    }
    toBuffer(writer) {
        super.toBuffer(writer)
        writer.writeFloat(this.pitch)
        writer.writeFloat(this.rollT)
    }     
    fromCmdArgs(args) {
        if (super.fromCmdArgs(args) && args.length >= 2) {
            let pitch = parseFloat(args.shift())
            let roll = parseFloat(args.shift())
            if (!Number.isNaN(pitch) && !Number.isNaN(roll)) {
                this.pitch = pitch
                this.roll = roll
                return true
            }
        }
        return false
    }
    toCmdArgs() {
        let args = super.toCmdArgs()
        args.push(this.pitch.toString())
        args.push(this.roll.toString())
        return args
    }                                                                         
}

class SensorDataRspMsg extends ErrorMsg {
    constructor(error = FW.ERROR_SUCCESS, origin = FW.UNDEF, reason = FW.REASON_UNSPEC) {
        super('SensorDataRspMsg', FW.UNDEF, FW.UNDEF, 0, error, origin, reason)
    }
}

// Helper function.
function stringToFloat(s) {
    let f = parseFloat(s)
    // @todo Define an invalid value rather than 0.
    return Number.isNaN(f)?0:f
}

module.exports = {
    SensorControlReqMsg,
    SensorControlCfmMsg,
    SensorDataIndMsg,
    SensorDataRspMsg,
}