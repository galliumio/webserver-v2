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

let {Evt, ErrorEvt, FW} = require("../../galliumstudio/lib/index.js")

class WsConnStartReq extends Evt {
    constructor(to = FW.UNDEF, from = FW.UNDEF, seq = 0) {
        super('WsConnStartReq', to, from, seq)
    }
}

class WsConnStartCfm extends ErrorEvt {
    constructor(error = FW.ERROR_SUCCESS, origin = FW.UNDEF, reason = FW.REASON_UNSPEC) {
        super('WsConnStartCfm', FW.UNDEF, FW.UNDEF, 0, error, origin, reason)
    }
}

class WsConnStopReq extends Evt {
    constructor(to = FW.UNDEF, from = FW.UNDEF, seq = 0) {
        super('WsConnStopReq', to, from, seq)
    }
}

class WsConnStopCfm extends ErrorEvt {
    constructor(error = FW.ERROR_SUCCESS, origin = FW.UNDEF, reason = FW.REASON_UNSPEC) {
        super('WsConnStopCfm', FW.UNDEF, FW.UNDEF, 0, error, origin, reason)
    }
}

class WsConnUseReq extends Evt {
    constructor(ws) {
        super('WsConnUseReq', FW.UNDEF, FW.UNDEF, 0)
        this.ws = ws
    }
}

class WsConnUseCfm extends ErrorEvt {
    constructor(error = FW.ERROR_SUCCESS, origin = FW.UNDEF, reason = FW.REASON_UNSPEC, connSts = null) {
        super('WsConnUseCfm', FW.UNDEF, FW.UNDEF, 0, error, origin, reason)
        this.connSts = connSts
    }
}

class WsConnDoneInd extends ErrorEvt {
    constructor(error = FW.ERROR_SUCCESS, origin = FW.UNDEF, reason = FW.REASON_UNSPEC, nodeId = null) {
        super('WsConnDoneInd', FW.UNDEF, FW.UNDEF, 0, error, origin, reason)
        this.nodeId = nodeId
    }
}

class WsConnMsgReq extends Evt {
    constructor(msg) {
        super('WsConnMsgReq', FW.UNDEF, FW.UNDEF, 0)
        this.msg = msg
    }
}

class WsConnMsgInd extends Evt {
    constructor(msg) {
        super('WsConnMsgInd', FW.UNDEF, FW.UNDEF, 0)
        this.msg = msg
    }
}

module.exports = {
    WsConnStartReq,
    WsConnStartCfm,
    WsConnStopReq,
    WsConnStopCfm,
    WsConnUseReq,
    WsConnUseCfm,
    WsConnDoneInd,
    WsConnMsgReq,
    WsConnMsgInd,
 }