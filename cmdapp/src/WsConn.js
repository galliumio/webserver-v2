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

let {Evt, ErrorEvt, Msg, fw, FW, Hsm, Timer} = require("../../galliumstudio/lib/index.js")
let {CmdSrvAuthReq, CmdSrvAuthCfm} = require("./CmdSrvInterface.js")
let {WsConnStartReq, WsConnStartCfm, WsConnStopReq, WsConnStopCfm, WsConnUseReq, WsConnUseCfm,
     WsConnDoneInd, WsConnMsgInd} = require("./WsConnInterface.js")
let {SrvAuthCfmMsg, SrvPingCfmMsg, SRV_PING_PERIOD_MS} = require('../msg/SrvMsgInterface.js')      
let {createMessageFromJson} = require('../msg/MsgFactory.js')      
let WebSocket = require('ws')

const STARTING_TIMEOUT_MS = 100
const STOPPING_TIMEOUT_MS = 100
const AUTH_TIMEOUT_MS = 3000
//const PING_WAIT_TIMEOUT_MS = (SRV_PING_PERIOD_MS + 1000)
const PING_WAIT_TIMEOUT_MS = (SRV_PING_PERIOD_MS + 2000)

class Fail extends ErrorEvt {
    constructor(error = FW.ERROR_UNSPEC, origin = FW.UNDEF, reason = FW.REASON_UNSPEC) {
        super('Fail', FW.UNDEF, FW.UNDEF, 0, error, origin, reason)
    }
}

class Closed extends ErrorEvt {
    constructor(error = FW.ERROR_UNSPEC, origin = FW.UNDEF, reason = FW.REASON_UNSPEC) {
        super('Closed', FW.UNDEF, FW.UNDEF, 0, error, origin, reason)
    }
}

class MsgEvt extends Evt {
    constructor(type, m) {
        super(type)
        this.msg = m
    }
}
// Specific type of message events
class WsOnMessage extends MsgEvt {
    constructor(m) { super('WsOnMessage', m) }
}

class WsConn extends Hsm {
    constructor(name) {
        let ctx = {
            savedStartReq: null,
            savedStopReq: null,
            savedAuthReqMsg: null,
            startingTimer: new Timer(name, "StartingTimer"),
            stoppingTimer: new Timer(name, "StoppingTimer"),
            authTimer: new Timer(name, 'AuthTimer'),
            pingWaitTimer: new Timer(name, 'PingWaitTimer'),
            user: null,
            ws: null,
            srvId: 'Srv',
            nodeId: null,
            username: null,
            pingCnt: 0,
        }
        let config = {
            initial: 'stopped',
            on: { 
                WsConnStartReq: {
                    actions: ({context: ctx, event: e})=> { 
                        this.event(e)
                        this.sendCfm(new WsConnStartCfm(FW.ERROR_STATE, this.name), e)
                    }
                },
                WsConnStopReq: {
                    target: '#stopping',
                    actions: ({context: ctx, event: e})=>{
                        this.event(e)
                        ctx.savedStopReq = e
                    }
                }
            },
            states: {
                stopped: {
                    entry: ({context: ctx, event: e})=>{ this.state('stopped') },
                    on: { 
                        WsConnStopReq: {
                            actions: ({context: ctx, event: e})=> { 
                                this.event(e)
                                this.sendCfm(new WsConnStopCfm(), e)
                            }
                        },
                        WsConnStartReq: {
                            target: 'starting',
                            actions: ({context: ctx, event: e})=> { 
                                this.event(e)
                                ctx.savedStartReq = e
                            }
                        }
                    },
                },
                starting: {
                    entry: ({context: ctx, event: e})=>{ 
                        this.state('starting')
                        ctx.startingTimer.start(STARTING_TIMEOUT_MS)
                        // @todo Initialization
                        this.raise(new Evt('Done'))
                    },
                    exit: ({context: ctx, event: e})=>{ 
                        ctx.startingTimer.stop()
                    },
                    on: { 
                        StartingTimer: {
                            target: '#stopping',
                            actions: ({context: ctx, event: e})=> { 
                                this.event(e)
                                this.sendCfm(new WsConnStartCfm(FW.ERROR_TIMEOUT, this.name), ctx.savedStartReq)
                            }
                        },
                        Fail: {
                            target: '#stopping',
                            actions: ({context: ctx, event: e})=> { 
                                this.event(e)
                                this.sendCfm(new WsConnStartCfm(e.error, e.origin, e.reason), ctx.savedStartReq)
                            }
                        },
                        Done: {
                            target: 'started',
                            actions: ({context: ctx, event: e})=> { 
                                this.sendCfm(new WsConnStartCfm(FW.ERROR_SUCCESS), ctx.savedStartReq)
                            }
                        }
                    },
                }, 
                stopping: {
                    id: 'stopping',
                    entry: ({context: ctx, event: e})=>{ 
                        this.state('stopping') 
                        ctx.stoppingTimer.start(STOPPING_TIMEOUT_MS)
                        this.raise(new Evt('Done'))
                    },
                    exit: ({context: ctx, event: e})=>{ 
                        ctx.stoppingTimer.stop()
                        this.recall()
                    },
                    on: { 
                        StoppingTimer: {
                            actions: ({context: ctx, event: e})=> { 
                                this.event(e)
                                fw.assert(0)
                            }
                        },
                        Fail: {
                            actions: ({context: ctx, event: e})=> { 
                                this.event(e)
                                fw.assert(0)
                            }
                        },
                        Done: {
                            target: 'stopped',
                            actions: ({context: ctx, event: e})=> { 
                                this.sendCfm(new WsConnStopCfm(FW.ERROR_SUCCESS), ctx.savedStopReq)
                            }
                        },
                        WsConnStopReq: {
                            actions: ({context: ctx, event: e})=>{
                                this.event(e)
                                this.defer(e)
                            }
                        }
                    },                    
                },                    
                started: {
                    initial: 'idle',
                    entry: ({context: ctx, event: e})=>{ this.state('started') },
                    states: {
                        idle: {
                            id: 'idle',
                            entry: ({context: ctx, event: e})=>{ 
                                this.state('idle')
                                ctx.user = null
                                ctx.username = null
                                ctx.ws = null
                            },
                            on: { 
                                WsConnUseReq: {
                                    target: '#connected',
                                    actions: ({context: ctx, event: e})=> { 
                                        this.event(e)
                                        ctx.user = e.from
                                        ctx.ws = e.ws 
                                        this.sendCfm(new WsConnUseCfm(FW.ERROR_SUCCESS), e)                           
                                    }
                                },
                            },
                        },
                        connected: {
                            id: 'connected',
                            initial: 'unauth',
                            entry: ({context: ctx, event: e})=>{
                                this.state('connected')
                                ctx.ws.on('message', (m)=>{
                                    this.log('ws received: ', m)
                                    //this.send(new WsOnMessage(JSON.parse(m)), this.name)
                                    const msg = createMessageFromJson(m)
                                    if (msg) {
                                        this.send(new WsOnMessage(msg), this.name)
                                    }
                                })
                                ctx.ws.on('close', ()=>{
                                    this.log('ws closed')
                                    this.send(new Evt('WsOnClosed', this.name))
                                })
                            },
                            on: {
                                WsOnClosed: {
                                    actions: ({context: ctx, event: e})=> {
                                        this.event(e)
                                        this.raise(new Closed(FW.ERROR_NETWORK, this.name))
                                    }
                                },
                                Closed: {
                                    target: '#idle',
                                    actions: ({context: ctx, event: e})=> {
                                        this.event(e)
                                        this.sendInd(new WsConnDoneInd(e.error, e.origin, e.reason, ctx.nodeId), ctx.user)
                                    }
                                }
                            },
                            states: {
                                unauth: {
                                    id: 'unauth',
                                    entry: ({context: ctx, event: e})=>{
                                        this.state('unauth')
                                        ctx.authTimer.start(AUTH_TIMEOUT_MS)
                                    },
                                    exit: ({context: ctx, event: e})=>{
                                        ctx.authTimer.stop()
                                    },
                                    on: {
                                        AuthTimer: {
                                            actions: ({context: ctx, event: e})=> {
                                                this.event(e)
                                                ctx.ws.close()
                                                this.raise(new Closed(FW.ERROR_TIMEOUT, this.name))
                                            }
                                        },
                                        AuthDone: {
                                            target: '#authenticated',
                                            actions: ({context: ctx, event: e})=> {
                                                this.event(e)
                                            }
                                        },
                                        WsOnMessage: {
                                            guard: ({context: ctx, event: e})=>(e.msg.type == 'SrvAuthReqMsg'),
                                            actions: ({context: ctx, event: e})=>{
                                                this.event(e)
                                                this.log('WsOnMessage: ', e.msg)
                                                ctx.savedAuthReqMsg = e.msg
                                                this.sendReq(new CmdSrvAuthReq(e.msg.username, e.msg.password, e.msg.nodeId, 'ws'), ctx.user)
                                            }
                                        },
                                        CmdSrvAuthCfm: {
                                            guard: ({context: ctx, event: e})=>this.matchSeq(e),
                                            actions: ({context: ctx, event: e})=>{
                                                this.event(e)
                                                let reqMsg = ctx.savedAuthReqMsg
                                                if (e.error == FW.ERROR_SUCCESS) {
                                                    ctx.username = reqMsg.username
                                                    ctx.nodeId = e.nodeId
                                                    this.sendCfmMsg(new SrvAuthCfmMsg(FW.ERROR_SUCCESS, FW.UNDEF, FW.REASON_UNSPEC, e.nodeId), reqMsg)
                                                    this.raise(new Evt('AuthDone'))
                                                } else {
                                                    this.sendCfmMsg(new SrvAuthCfmMsg(e.error, this.srvId, e.reason), reqMsg)
                                                    ctx.ws.close()
                                                    this.raise(new Closed(e.error, e.origin, e.reason))
                                                }
                                            }
                                        }
                                    }
                                },
                                authenticated: {
                                    id: 'authenticated',
                                    entry: ({context: ctx, event: e})=>{
                                        this.state('authenticated')
                                        ctx.pingWaitTimer.start(PING_WAIT_TIMEOUT_MS, true)
                                        ctx.pingCnt = 0 
                                    },
                                    exit: ({context: ctx, event: e})=>{
                                        ctx.pingWaitTimer.stop()
                                    },
                                    on: {
                                        PingWaitTimer: {
                                            actions: ({context: ctx, event: e})=> {
                                                this.event(e)
                                                if (ctx.pingCnt > 0) {
                                                    ctx.pingCnt = 0
                                                } else {
                                                    ctx.ws.close()
                                                    this.raise(new Closed(FW.ERROR_TIMEOUT, this.name))
                                                }
                                            }
                                        },
                                        WsConnMsgReq: {
                                            actions: ({context: ctx, event: e})=> {
                                                this.event(e)
                                                this.postMsg(e.msg)
                                            }
                                        },
                                        WsOnMessage: {
                                            actions: ({context: ctx, event: e})=>{
                                                this.event(e)
                                                //this.log('WsOnMessage: ', e.msg)
                                                if (e.msg.type == 'SrvPingReqMsg') {
                                                    ctx.pingCnt++
                                                    this.sendCfmMsg(new SrvPingCfmMsg(), e.msg)
                                                } else {
                                                    this.sendInd(new WsConnMsgInd(e.msg), ctx.user)
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                },                                  
            }
        }
        super(name, ctx, config)
        this.ctx = ctx
    }
    // Member functions (prototype)
    postMsg(m) {
        let ws = this.ctx.ws
        // Use exception instead of checks below, since socket may close after the check.
        /*
        if (ws.readyState == WebSocket.CLOSING || ws.readyState == WebSocket.CLOSED) {
            this.warning('postMsg: ws closing or closed. Discards ', m)
            return
        }
        */
        this.log('postMsg: ', m)
        try {
            ws.send(JSON.stringify(m))
        } catch(e) {
            this.log("ws.send() failed: ", e)
        }
    }
    sendReqMsg(m, to, group) { super.sendReq_((m)=>this.postMsg(m), m, to, group, this.ctx.srvId) }
    sendCfmMsg(m, req) { super.sendCfm_((m)=>this.postMsg(m), m, req, this.ctx.srvId) }
    sendIndMsg(m, to, group) { this.sendReqMsg(m, to, group) }
    sendRspMsg(m, req) { this.sendCfmMsg(m, req) }
}

module.exports = {
    WsConn
 }

