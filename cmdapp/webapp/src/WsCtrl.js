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

let {Evt, ErrorEvt, fw, FW, Hsm, Timer} = require("../../../galliumstudio/lib/index.js")
let {WsCtrlStartReq, WsCtrlStartCfm, WsCtrlStopReq, WsCtrlStopCfm, WsCtrlOpenReq, WsCtrlOpenCfm,
    WsCtrlCloseReq, WsCtrlCloseCfm, WsCtrlCloseInd, WsCtrlMsgInd} = require("./WsCtrlInterface.js")
let {SrvAuthReqMsg, SrvAuthCfmMsg, SrvPingReqMsg, SrvPingCfmMsg, SRV_PING_PERIOD_MS} = require('../../msg/SrvMsgInterface.js')
let {WTimer} = require('./WTimer.js')

const STARTING_TIMEOUT_MS = 100
const STOPPING_TIMEOUT_MS = 100
const OPENING_TIMEOUT_MS = 800
const OPEN_DELAY_TIMEOUT_MS = 200
//const PING_CFM_TIMEOUT_MS = 600
const PING_CFM_TIMEOUT_MS = 1500

class Fail extends ErrorEvt {
    constructor(error = FW.ERROR_UNSPEC, origin = FW.UNDEF, reason = FW.REASON_UNSPEC) {
        super('Fail', FW.UNDEF, FW.UNDEF, 0, error, origin, reason)
    }
}

class OpenFail extends ErrorEvt {
    constructor(error = FW.ERROR_UNSPEC, origin = FW.UNDEF, reason = FW.REASON_UNSPEC) {
        super('OpenFail', FW.UNDEF, FW.UNDEF, 0, error, origin, reason)
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
class WsOnMessage extends Evt {
    constructor(m) { 
        super('WsOnMessage')
        this.msg = m
    }
}

export class WsCtrl extends Hsm {
    constructor(name) {
        let ctx = {
            user: null,             // User component using this object (e.g. WebApp)
            savedStartReq: null,
            savedStopReq: null,
            savedOpenReq: null,
            startingTimer: new Timer(name, "StartingTimer"),
            stoppingTimer: new Timer(name, "StoppingTimer"),
            openDelayTimer: new Timer(name, "OpenDelayTimer"),  // Test only (to be replaced with a 'ready' indication from srv).
            openingTimer: new Timer(name, "OpeningTimer"),
            pingReqTimer: new Timer(name, 'PingReqTimer'),
            pingCfmTimer: new Timer(name, 'PingCfmTimer'),
            ws: null,
            nodeId: FW.UNDEF,          // Unique ID/name of this node to be assigned by the server (default as "UNDEF").
            srvId: 'Srv',
        }
        let config = {
            initial: 'stopped',
            on: { 
                WsCtrlStartReq: {
                    actions: ({context: ctx, event: e})=> { 
                        this.event(e)
                        this.sendCfm(new WsCtrlStartCfm(FW.ERROR_STATE, this.name), e)
                    }
                },
                WsCtrlStopReq: {
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
                        WsCtrlStopReq: {
                            actions: ({context: ctx, event: e})=> { 
                                this.event(e)
                                this.sendCfm(new WsCtrlStopCfm(), e)
                            }
                        },
                        WsCtrlStartReq: {
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
                                this.sendCfm(new WsCtrlStartCfm(FW.ERROR_TIMEOUT, this.name), ctx.savedStartReq)
                            }
                        },
                        Fail: {
                            target: '#stopping',
                            actions: ({context: ctx, event: e})=> { 
                                this.event(e)
                                this.sendCfm(new WsCtrlStartCfm(e.error, e.origin, e.reason), ctx.savedStartReq)
                            }
                        },
                        Done: {
                            target: 'started',
                            actions: ({context: ctx, event: e})=> { 
                                this.sendCfm(new WsCtrlStartCfm(FW.ERROR_SUCCESS), ctx.savedStartReq)
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
                                this.sendCfm(new WsCtrlStopCfm(FW.ERROR_SUCCESS), ctx.savedStopReq)
                            }
                        },
                        WsCtrlStopReq: {
                            actions: ({context: ctx, event: e})=>{
                                this.event(e)
                                this.defer(e)
                            }
                        }
                    },                    
                },                    
                started: {
                    id: 'started',
                    initial: 'idle',
                    entry: ({context: ctx, event: e})=>{ this.state('started') },
                    on: {
                        WsCtrlOpenReq: {
                            actions: ({context: ctx, event: e})=>{
                                this.event(e)
                                this.sendCfm(new WsCtrlOpenCfm(FW.ERROR_STATE, this.name), e)
                            }
                        },
                        OpenFail: {
                            target: '#idle',
                            actions: ({context: ctx, event: e})=>{
                                this.event(e)
                                this.sendCfm(new WsCtrlOpenCfm(e.error, e.origin, e.reason), ctx.savedOpenReq)
                            } 
                        },
                        Closed: {
                            target: '#idle',
                            actions: ({context: ctx, event: e})=>{
                                this.event(e)
                                this.sendInd(new WsCtrlCloseInd(e.error, e.origin, e.reason), ctx.user)
                            }
                        },
                    },
                    states: {
                        idle: {
                            id: 'idle',
                            entry: ({context: ctx, event: e})=>{ 
                                this.state('idle')
                                ctx.user = null
                                ctx.nodeId = FW.UNDEF
                            },
                            on: { 
                                WsCtrlCloseReq: {
                                    actions: ({context: ctx, event: e})=>{
                                        this.event(e)
                                        this.sendCfm(new WsCtrlCloseCfm(), e)
                                    }
                                },
                                WsCtrlOpenReq: {
                                    target: 'opening',
                                    actions: ({context: ctx, event: e})=> { 
                                        this.event(e)
                                        this.log(`URL = ${e.url}`)
                                        ctx.user = e.from
                                        ctx.savedOpenReq = e
                                    }
                                },
                            }
                        },
                        opening: {
                            initial: 'openWait',
                            entry: ({context: ctx, event: e})=>{
                                this.state('opening')
                                ctx.openingTimer.start(OPENING_TIMEOUT_MS)
                            },
                            exit: ({context: ctx, event: e})=>{
                                ctx.openingTimer.stop()
                                this.recall()
                            },
                            on: {
                                OpeningTimer: {
                                    actions: ({context: ctx, event: e})=> { 
                                        this.event(e)
                                        ctx.ws.close()
                                        this.raise(new OpenFail(FW.ERROR_TIMEOUT, this.name))
                                    }
                                },
                                WsOnClose: {
                                    actions: ({context: ctx, event: e})=> { 
                                        this.event(e)
                                        ctx.ws.close()
                                        this.raise(new OpenFail(FW.ERROR_NETWORK, this.name))
                                    }
                                },
                                WsOnError: {
                                    actions: ({context: ctx, event: e})=> { 
                                        this.event(e)
                                        ctx.ws.close()
                                        this.raise(new OpenFail(FW.ERROR_NETWORK, this.name))
                                    }
                                },
                                WsCtrlCloseReq: {
                                    actions: ({context: ctx, event: e})=> { 
                                        this.event(e)
                                        this.defer(e)
                                        ctx.ws.close()
                                        this.raise(new OpenFail(FW.ERROR_ABORT, this.name))
                                    }
                                },
                                WsCtrlStopReq: {
                                    actions: ({context: ctx, event: e})=> { 
                                        this.event(e)
                                        this.defer(e)
                                        ctx.ws.close()
                                        this.raise(new OpenFail(FW.ERROR_ABORT, this.name))
                                    }
                                }
                            },
                            states: {
                                openWait: {
                                    entry: ({context: ctx, event: e})=>{
                                        this.state('openWait')
                                        ctx.ws = new WebSocket(ctx.savedOpenReq.url)
                                        ctx.ws.addEventListener('open', (event)=>{
                                            this.send(new Evt('WsOnOpen'), this.name)
                                        });
                                        ctx.ws.addEventListener('message', (event)=>{
                                            this.send(new WsOnMessage(JSON.parse(event.data)), this.name)
                                        });  
                                        ctx.ws.addEventListener('close', (event)=>{
                                            this.send(new Evt('WsOnClose'), this.name)
                                        });   
                                        ctx.ws.addEventListener('error', (event)=>{
                                            this.send(new Evt('WsOnError'), this.name)
                                        });       
                                    },
                                    on: {
                                        WsOnOpen: {
                                            actions: ({context: ctx, event: e})=>{
                                                this.event(e)
                                                ctx.openDelayTimer.start(OPEN_DELAY_TIMEOUT_MS)
                                            }
                                        },
                                        OpenDelayTimer: {
                                            target: 'authWait',
                                            actions: ({context: ctx, event: e})=>{this.event(e)}
                                        },
                                    }
                                },
                                authWait: {
                                    entry: ({context: ctx, event: e})=>{
                                        this.state('authWait')
                                        let {username, password} = ctx.savedOpenReq
                                        this.sendReqMsg(new SrvAuthReqMsg(username, password, ctx.nodeId), ctx.srvId)
                                    },
                                    on: {
                                        WsOnMessage: [
                                            {
                                                target: '#opened',
                                                guard: ({context: ctx, event: e})=>{
                                                    return (e.msg.type == 'SrvAuthCfmMsg') && (e.msg.error == FW.ERROR_SUCCESS)
                                                },
                                                actions: ({context: ctx, event: e})=>{
                                                    this.event(e)
                                                    this.log('WsOnMessage: ', e.msg)
                                                    ctx.nodeId = e.msg.nodeId
                                                    this.sendCfm(new WsCtrlOpenCfm(), ctx.savedOpenReq)
                                                }
                                            },
                                            {
                                                guard: ({context: ctx, event: e})=>{
                                                    return (e.msg.type == 'SrvAuthCfmMsg') && (e.msg.error != FW.ERROR_SUCCESS)
                                                },
                                                actions: ({context: ctx, event: e})=>{
                                                    this.event(e)
                                                    this.log('WsOnMessage: ', e.msg)
                                                    ctx.ws.close()
                                                    this.raise(new OpenFail(e.msg.error, e.msg.origin, e.msg.reason))
                                                }
                                            }
                                        ]
                                    }
                                }
                            }
                        },
                        opened: {
                            id: 'opened',
                            entry: ({context: ctx, event: e})=>{
                                this.state('opened')
                                ctx.pingReqTimer.start(SRV_PING_PERIOD_MS, true)
                            },
                            exit: ({context: ctx, event: e})=>{
                                ctx.pingReqTimer.stop()
                                ctx.pingCfmTimer.stop()
                                ctx.ws.close()
                                this.recall()
                            },
                            on: {
                                PingReqTimer: {
                                    actions: ({context: ctx, event: e})=>{
                                        this.event(e)
                                        this.sendReqMsg(new SrvPingReqMsg(), ctx.srvId)
                                        ctx.pingCfmTimer.start(PING_CFM_TIMEOUT_MS)
                                    }
                                },
                                PingCfmTimer: {
                                    actions: ({context: ctx, event: e})=>{
                                        this.event(e)
                                        this.raise(new Closed(FW.ERROR_TIMEOUT), this.name)
                                    }
                                },
                                WsOnClose: {
                                    actions: ({context: ctx, event: e})=>{
                                        this.event(e)
                                        this.raise(new Closed(FW.ERROR_NETWORK), this.name)
                                    }
                                },
                                WsCtrlMsgReq: {
                                    actions: ({context: ctx, event: e})=>{
                                        this.event(e)
                                        this.log(`WsCtrlMsgReq (msgTo=${e.msgTo}, msgSeq=${e.msgSeq}): `, e.msg)
                                        this.sendMsg(e.msg, e.msgTo, e.msgSeq)
                                    }
                                },                           
                                WsOnMessage: {
                                    actions: ({context: ctx, event: e})=>{
                                        this.event(e)
                                        this.log('WsOnMessage: ', e.msg)
                                        if (e.msg.type == 'SrvPingCfmMsg') {
                                            ctx.pingCfmTimer.stop()
                                        } else {
                                            this.send(new WsCtrlMsgInd(e.msg), ctx.user)
                                        }
                                    }
                                }
                            }
                        }
                    }
                }                                 
            }
        }
        super(name, ctx, config)
        this.ctx = ctx
    }
    // Member functions (prototype)
    postMsg(m) {
        this.log('postMsg: ', m)
        try {
            this.ctx.ws.send(JSON.stringify(m))
        } catch(e) {
            this.log("ws.send() failed: ", e)
        }
    }
    sendReqMsg(m, to, group) { super.sendReq_((m)=>this.postMsg(m), m, to, group, this.ctx.nodeId) }
    sendCfmMsg(m, req) { super.sendCfm_((m)=>this.postMsg(m), m, req, this.ctx.nodeId) }
    sendIndMsg(m, to, group) { this.sendReqMsg(m, to, group) }
    sendRspMsg(m, req) { this.sendCfmMsg(m, req) }
    // Sends a message on behalf of another hsm, and therefore it does not keep track of seq no.
    // 'to' specifies the id of the destination which can be srvId or the nodeId of another node.
    sendMsg(m, to, seq) {
        m.from = this.ctx.nodeId
        m.to = to
        m.seq = seq
        this.postMsg(m)
    }
}

//module.exports = {
//    WsCtrl
// }
//export default WsCtrl

