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

let {Msg, fw} = require("../../galliumstudio/lib/index.js")
let {SrvAuthReqMsg, SrvPingReqMsg} = require('../msg/SrvMsgInterface.js')      
let {DispTickerReqMsg, DispTickerCfmMsg} = require('../msg/DispMsgInterface.js')   
let {SensorControlReqMsg, SensorControlCfmMsg, SensorDataIndMsg, SensorDataRspMsg} = require('../msg/SensorMsgInterface.js')   


// Parses a Buffer and converts it to the specified message.
// @return A Msg object if success; otherwise null.
function createMessageFromBuffer(buffer, msgType, msgLen) {
    switch(msgType) {
        case 'SrvAuthReqMsg': { return Msg.createMessage(SrvAuthReqMsg, buffer, msgLen) }
        case 'SrvPingReqMsg': { return Msg.createMessage(SrvPingReqMsg, buffer, msgLen) }
        case 'DispTickerReqMsg': { return Msg.createMessage(DispTickerReqMsg, buffer, msgLen) }
        case 'DispTickerCfmMsg': { return Msg.createMessage(DispTickerCfmMsg, buffer, msgLen) }
        case 'SensorControlReqMsg': { return Msg.createMessage(SensorControlReqMsg, buffer, msgLen) }
        case 'SensorControlCfmMsg': { return Msg.createMessage(SensorControlCfmMsg, buffer, msgLen) }
        case 'SensorDataIndMsg': { return Msg.createMessage(SensorDataIndMsg, buffer, msgLen) }
        case 'SensorDataRspMsg': { return Msg.createMessage(SensorDataRspMsg, buffer, msgLen) }
        // Add further msg types here.
    }
    return null
}

// Parses a json message and converts it to the specified message object.
// @return A Msg object if success; otherwise null.
function createMessageFromJson(json) {
    const m = JSON.parse(json)
    switch(m.type) {
        case 'SrvAuthReqMsg': { return Msg.createMessageFromJson(SrvAuthReqMsg, m) }
        case 'SrvPingReqMsg': { return Msg.createMessageFromJson(SrvPingReqMsg, m) }
        case 'DispTickerReqMsg': { return Msg.createMessageFromJson(DispTickerReqMsg, m) }
        case 'DispTickerCfmMsg': { return Msg.createMessageFromJson(DispTickerCfmMsg, m) }
        case 'SensorControlReqMsg': { return Msg.createMessageFromJson(SensorControlReqMsg, m) }
        case 'SensorControlCfmMsg': { return Msg.createMessageFromJson(SensorControlCfmMsg, m) }
        case 'SensorDataIndMsg': { return Msg.createMessageFromJson(SensorDataIndMsg, m) }
        case 'SensorDataRspMsg': { return Msg.createMessageFromJson(SensorDataRspMsg, m) }
        // Add further msg types here.
    }
    return null
}

// Converts an array of command line arguments to the specified message object.
// @return A Msg object if success; otherwise null.
function createMessageFromCmdArgs(args) {
    fw.assert(Array.isArray(args))
    if (args.length >= 1) {
        // The first argument is the message type.
        switch(args[0]) {
            case 'SrvAuthReqMsg': { return Msg.createMessageFromCmdArgs(SrvAuthReqMsg, args) }
            case 'SrvPingReqMsg': { return Msg.createMessageFromCmdArgs(SrvPingReqMsg, args) }
            case 'DispTickerReqMsg': { return Msg.createMessageFromCmdArgs(DispTickerReqMsg, args) }
            case 'DispTickerCfmMsg': { return Msg.createMessageFromCmdArgs(DispTickerCfmMsg, args) }
            case 'SensorControlReqMsg': { return Msg.createMessageFromCmdArgs(SensorControlReqMsg, args) }
            case 'SensorControlCfmMsg': { return Msg.createMessageFromCmdArgs(SensorControlCfmMsg, args) }
            case 'SensorDataIndMsg': { return Msg.createMessageFromCmdArgs(SensorDataIndMsg, args) }
            case 'SensorDataRspMsg': { return Msg.createMessageFromCmdArgs(SensorDataRspMsg, args) }
            // Add further msg types here.
        }
    }
    return null
}

module.exports = {
    createMessageFromBuffer,
    createMessageFromJson,
    createMessageFromCmdArgs,
}