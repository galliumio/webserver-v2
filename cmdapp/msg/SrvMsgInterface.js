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

// Message interface for the "Srv (Server)" role.

// "to" must be Srv.
// Binary format.
/* 
    char username[32];
    char password[32];
    char nodeId[16];
*/
class SrvAuthReqMsg extends Msg {
    constructor(username = FW.UNDEF, password = FW.UNDEF, nodeId = FW.UNDEF) {
        super('SrvAuthReqMsg')
        this.username = username
        this.password = password
        this.nodeId = nodeId
    }
    bufferSize() { return super.bufferSize() + FW.USERNAME_LEN + FW.PASSWORD_LEN + FW.ID_LEN }
    fromBuffer(reader) {
        super.fromBuffer(reader)
        this.username = reader.readString(FW.USERNAME_LEN)
        this.password = reader.readString(FW.PASSWORD_LEN)
        this.nodeId = reader.readString(FW.ID_LEN)
    }
    toBuffer(writer) {
        super.toBuffer(writer)
        writer.writeString(this.username, FW.USERNAME_LEN)
        writer.writeString(this.password, FW.PASSWORD_LEN)
        writer.writeString(this.nodeId, FW.ID_LEN)
    }       
    fromCmdArgs(args) {
        if (super.fromCmdArgs(args) && (args.length >= 3)) {
            this.username = args.shift()
            this.password = args.shift()
            this.nodeId = args.shift()
            return true
        }
        return false
    }
    toCmdArgs() {
        let args = super.toCmdArgs()
        args.push(this.username)
        args.push(this.password)
        args.push(this.nodeId)
        return args
    }                                                                   
}

// Binary format.
/* 
    char nodeId[16];
*/
class SrvAuthCfmMsg extends ErrorMsg {
    constructor(error = FW.ERROR_SUCCESS, origin = FW.UNDEF, reason = FW.REASON_UNSPEC, nodeId = FW.UNDEF) {
        super('SrvAuthCfmMsg', FW.UNDEF, FW.UNDEF, 0, error, origin, reason)
        this.nodeId = nodeId
    }
    bufferSize() { return super.bufferSize() + FW.ID_LEN }
    fromBuffer(reader) {
        super.fromBuffer(reader)
        this.nodeId = reader.readString(FW.ID_LEN)
    }
    toBuffer(writer) {
        super.toBuffer(writer)
        writer.writeString(this.nodeId, FW.ID_LEN)
    }     
    fromCmdArgs(args) {
        if (super.fromCmdArgs(args) && (args.length >= 1)) {
            this.nodeId = args.shift()
            return true
        }
        return false
    } 
    toCmdArgs() {
        let args = super.toCmdArgs()
        args.push(this.nodeId)
        return args
    }
}

const SRV_PING_PERIOD_MS = 2000
class SrvPingReqMsg extends Msg {
    constructor() {
        super('SrvPingReqMsg')
    }
}

class SrvPingCfmMsg extends ErrorMsg {
    constructor(error = FW.ERROR_SUCCESS, origin = FW.UNDEF, reason = FW.REASON_UNSPEC) {
        super('SrvPingCfmMsg', FW.UNDEF, FW.UNDEF, 0, error, origin, reason)
    }
}

// Helper class to store connection status.
class ConnSts {
    constructor(nodeId, username, hsm, connType) {
        this.nodeId = nodeId
        this.username = username
        this.hsm = hsm
        this.connType = connType
    }
}
// Server connection status indication.
// Binary format.
/*  
    uint32_t numConn;       // Number of used connections in status[].
    ConnSts  status[16];    // @todo Max no. of conn = APP.WS_CONN_CNT + APP.TCP_CONN_CNT + APP.TCPJS_CONN_CNT + APP.CLI_CONN_CNT
                            //       We need to split them up among multiple SrvConnStsIndMsg (Add msg index and total msg cnt).
                            // @todo - Define the constant '16' in SrvConnStsIndMsg.prototype.
    where ConnSts contains:
    char nodeId[16];        // Unique ID of the node.
    char username[32];      // User name authenticating this connection.
    char hsm[16];           // HSM name of the connection object.
    char connType[4];       // Connection type - 'ws', 'tcp'    
*/
class SrvConnStsIndMsg extends Msg {
    constructor(status) {
        super('SrvConnStsIndMsg')
        fw.assert((status == null) || Array.isArray(status))
        this.numConn = status ? status.length : 0
        this.status = status
        fw.assert(this.numConn <= 16)
    }
    bufferSize() { return super.bufferSize() + 4 + 16*(FW.ID_LEN + FW.USERNAME_LEN + FW.ID_LEN + 4) }
    fromBuffer(reader) {
        super.fromBuffer(reader)
        this.numConn = reader.readUint32()
        this.status = []
        for (let i = 0; i < this.numConn; i++) {
            this.status.push(new ConnSts(reader.readString(FW.ID_LEN), reader.readString(FW.USERNAME_LEN), 
                reader.readString(FW.ID_LEN), reader.readString(4)))
        }
    }
    toBuffer(writer) {
        super.toBuffer(writer)
        fw.assert(this.numConn <= 16)
        writer.writeUint32(this.numConn)
        for (let i = 0; i < this.numConn; i++) {
            const sts = this.status[i]
            writer.writeString(sts.nodeId, FW.ID_LEN)
            writer.writeString(sts.username, FW.USERNAME_LEN)
            writer.writeString(sts.hsm, FW.ID_LEN)
            writer.writeString(sts.connType, 4)
        }
        for (let i = 0; i < 16 - this.numConn; i++) {
            writer.writeString("", FW.ID_LEN)
            writer.writeString("", FW.USERNAME_LEN)
            writer.writeString("", FW.ID_LEN)
            writer.writeString("", 4)
        }
    }     
    fromCmdArgs(args) {
        if (super.fromCmdArgs(args) && (args.length >= 1)) {
            this.numConn = parseInt(args.shift())
            this.status = []
            if ((this.numConn <= 16) && (args.length >= (4 * this.numConn))) {
                for (let i = 0; i < this.numConn; i++) {
                    this.status.push(new ConnSts(args.shift(), args.shift(), args.shift(), args.shift()))
                }
                return true
            }
        }
        return false
    } 
    toCmdArgs() {
        let args = super.toCmdArgs()
        fw.assert(this.numConn <= 16)
        args.push(this.numConn.toString())
        for (let i = 0; i < this.numComm; i++) {
            args.push(this.nodeId)
            args.push(this.username)
            args.push(this.hsm)
            args.push(this.connType)
        }
        return args
    }   
}

module.exports = {
    SrvAuthReqMsg,
    SrvAuthCfmMsg,
    SRV_PING_PERIOD_MS,
    SrvPingReqMsg,
    SrvPingCfmMsg,
    ConnSts,
    SrvConnStsIndMsg,
}