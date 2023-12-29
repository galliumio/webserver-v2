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

let {Evt, ErrorEvt, FW} = require("../../galliumio/lib/index.js")

class CmdSrvStartReq extends Evt {
    constructor(to = FW.UNDEF, from = FW.UNDEF, seq = 0) {
        super('CmdSrvStartReq', to, from, seq)
    }
}

class CmdSrvStartCfm extends ErrorEvt {
    constructor(error = FW.ERROR_SUCCESS, origin = FW.UNDEF, reason = FW.REASON_UNSPEC) {
        super('CmdSrvStartCfm', FW.UNDEF, FW.UNDEF, 0, error, origin, reason)
    }
}

class CmdSrvStopReq extends Evt {
    constructor(to = FW.UNDEF, from = FW.UNDEF, seq = 0) {
        super('CmdSrvStopReq', to, from, seq)
    }
}

class CmdSrvStopCfm extends ErrorEvt {
    constructor(error = FW.ERROR_SUCCESS, origin = FW.UNDEF, reason = FW.REASON_UNSPEC) {
        super('CmdSrvStopCfm', FW.UNDEF, FW.UNDEF, 0, error, origin, reason)
    }
}

// @param nodeId - Node ID suggested by the client node. If none, client should use FW.UNDEF.
class CmdSrvAuthReq extends Evt {
    constructor(username = FW.UNDEF, password = FW.UNDEF, nodeId = FW.UNDEF, connType = null) {
        super('CmdSrvAuthReq')
        this.username = username
        this.password = password
        this.nodeId = nodeId
        this.connType = connType
    }
}

// @param nodeId - Node ID assigned by the CmdSrv if the user does not suggest one in the request;
//                 otherwise it is the same as that suggested by the user unless it's already used.
class CmdSrvAuthCfm extends ErrorEvt {
    constructor(error = FW.ERROR_SUCCESS, origin = FW.UNDEF, reason = FW.REASON_UNSPEC, nodeId = FW.UNDEF) {
        super('CmdSrvAuthCfm', FW.UNDEF, FW.UNDEF, 0, error, origin, reason)
        this.nodeId = nodeId
    }
}

module.exports = {
    CmdSrvStartReq,
    CmdSrvStartCfm,
    CmdSrvStopReq,
    CmdSrvStopCfm,
    CmdSrvAuthReq,
    CmdSrvAuthCfm,
 }