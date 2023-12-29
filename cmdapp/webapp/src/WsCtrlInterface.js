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

let {Evt, ErrorEvt, FW} = require("../../../galliumio/lib/index.js")

class WsCtrlStartReq extends Evt {
    constructor(to = FW.UNDEF, from = FW.UNDEF, seq = 0) {
        super('WsCtrlStartReq', to, from, seq)
    }
}

class WsCtrlStartCfm extends ErrorEvt {
    constructor(error = FW.ERROR_SUCCESS, origin = FW.UNDEF, reason = FW.REASON_UNSPEC) {
        super('WsCtrlStartCfm', FW.UNDEF, FW.UNDEF, 0, error, origin, reason)
    }
}

class WsCtrlStopReq extends Evt {
    constructor(to = FW.UNDEF, from = FW.UNDEF, seq = 0) {
        super('WsCtrlStopReq', to, from, seq)
    }
}

class WsCtrlStopCfm extends ErrorEvt {
    constructor(error = FW.ERROR_SUCCESS, origin = FW.UNDEF, reason = FW.REASON_UNSPEC) {
        super('WsCtrlStopCfm', FW.UNDEF, FW.UNDEF, 0, error, origin, reason)
    }
}

// to, from and seq are automatically set by send().
// @param url - hostname and pathname of the URL to connect to.
class WsCtrlOpenReq extends Evt {
    constructor(url, username, password) {
        super('WsCtrlOpenReq')
        this.url = url
        this.username = username
        this.password = password
    }
}

class WsCtrlOpenCfm extends ErrorEvt {
    constructor(error = FW.ERROR_SUCCESS, origin = FW.UNDEF, reason = FW.REASON_UNSPEC) {
        super('WsCtrlOpenCfm', FW.UNDEF, FW.UNDEF, 0, error, origin, reason)
    }
}

class WsCtrlCloseReq extends Evt {
    constructor() {
        super('WsCtrlCloseReq')
    }
}

class WsCtrlCloseCfm extends ErrorEvt {
    constructor(error = FW.ERROR_SUCCESS, origin = FW.UNDEF, reason = FW.REASON_UNSPEC) {
        super('WsCtrlCloseCfm', FW.UNDEF, FW.UNDEF, 0, error, origin, reason)
    }
}

class WsCtrlCloseInd extends ErrorEvt {
    constructor(error = FW.ERROR_SUCCESS, origin = FW.UNDEF, reason = FW.REASON_UNSPEC) {
        super('WsCtrlCloseInd', FW.UNDEF, FW.UNDEF, 0, error, origin, reason)
    }
}

class WsCtrlMsgReq extends Evt {
    constructor(m, to, seq = 0) {
        super('WsCtrlMsgReq')
        this.msg =  m
        this.msgTo = to
        this.msgSeq = seq
    }
}

class WsCtrlMsgInd extends Evt {
    constructor(m) {
        super('WsCtrlMsgInd')
        this.msg = m
    }
}

module.exports = {
    WsCtrlStartReq,
    WsCtrlStartCfm,
    WsCtrlStopReq,
    WsCtrlStopCfm,
    WsCtrlOpenReq,
    WsCtrlOpenCfm,
    WsCtrlCloseReq,
    WsCtrlCloseCfm,
    WsCtrlCloseInd,
    WsCtrlMsgReq,
    WsCtrlMsgInd,
 }