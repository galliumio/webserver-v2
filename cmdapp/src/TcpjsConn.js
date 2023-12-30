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

let {Evt, ErrorEvt, Msg, fw, FW, Hsm, Timer, BufReader, BufWriter} = require("../../galliumstudio/lib/index.js")
let {CmdSrvAuthReq, CmdSrvAuthCfm} = require("./CmdSrvInterface.js")
let {TcpjsConnStartReq, TcpjsConnStartCfm, TcpjsConnStopReq, TcpjsConnStopCfm, TcpjsConnUseReq, TcpjsConnUseCfm,
     TcpjsConnDoneInd, TcpjsConnMsgInd} = require("./TcpjsConnInterface.js")
let {SrvAuthCfmMsg, SrvPingCfmMsg, SRV_PING_PERIOD_MS} = require('../msg/SrvMsgInterface.js')      
let {createMessageFromJson} = require('../msg/MsgFactory.js')      
const { DispTickerReqMsg } = require("../msg/DispMsgInterface.js")

const STARTING_TIMEOUT_MS = 100
const STOPPING_TIMEOUT_MS = 100
const AUTH_TIMEOUT_MS = 3000
const PING_WAIT_TIMEOUT_MS = (SRV_PING_PERIOD_MS + 1000)
//const PING_WAIT_TIMEOUT_MS = (SRV_PING_PERIOD_MS + 3000)
// Test only
const TEST_TIMEOUT_MS = 200

class Fail extends ErrorEvt {
    constructor(error = FW.ERROR_UNSPEC, origin = FW.UNDEF, reason = FW.REASON_UNSPEC) {
        super('Fail', FW.UNDEF, FW.UNDEF, 0, error, origin, reason)
    }
}
class MsgEvt extends Evt {
    constructor(type, m) {
        super(type)
        this.msg = m
    }
}
// Specific type of message events
class SockOnMessage extends MsgEvt {
    constructor(m) { super('SockOnMessage', m) }
}

class TcpjsConn extends Hsm {
    constructor(name) {
        let ctx = {
            savedStartReq: null,
            savedStopReq: null,
            savedAuthReqMsg: null,
            startingTimer: new Timer(name, "StartingTimer"),
            stoppingTimer: new Timer(name, "StoppingTimer"),
            authTimer: new Timer(name, 'AuthTimer'),
            pingWaitTimer: new Timer(name, 'PingWaitTimer'),
            // Test only.
            testTimer: new Timer(name, "TestTimer"),
            user: null,
            sock: null,
            error: null,
            srvId: 'Srv',
            nodeId: null,
            pingCnt: 0,
            savedLine: '',       // Received (incomplete JSON) data from socket to be processed.
        }
        let config = {
            initial: 'stopped',
            on: { 
                TcpjsConnStartReq: {
                    actions: ({context: ctx, event: e})=> { 
                        this.event(e)
                        this.sendCfm(new TcpjsConnStartCfm(FW.ERROR_STATE, this.name), e)
                    }
                },
                TcpjsConnStopReq: {
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
                        TcpjsConnStopReq: {
                            actions: ({context: ctx, event: e})=> { 
                                this.event(e)
                                this.sendCfm(new TcpjsConnStopCfm(), e)
                            }
                        },
                        TcpjsConnStartReq: {
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
                                this.sendCfm(new TcpjsConnStartCfm(FW.ERROR_TIMEOUT, this.name), ctx.savedStartReq)
                            }
                        },
                        Fail: {
                            target: '#stopping',
                            actions: ({context: ctx, event: e})=> { 
                                this.event(e)
                                this.sendCfm(new TcpjsConnStartCfm(e.error, e.origin, e.reason), ctx.savedStartReq)
                            }
                        },
                        Done: {
                            target: 'started',
                            actions: ({context: ctx, event: e})=> { 
                                this.sendCfm(new TcpjsConnStartCfm(FW.ERROR_SUCCESS), ctx.savedStartReq)
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
                                this.sendCfm(new TcpjsConnStopCfm(FW.ERROR_SUCCESS), ctx.savedStopReq)
                            }
                        },
                        TcpjsConnStopReq: {
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
                                ctx.sock = null
                            },
                            on: { 
                                TcpjsConnUseReq: {
                                    target: 'connected',
                                    actions: ({context: ctx, event: e})=> { 
                                        this.event(e)
                                        ctx.user = e.from
                                        ctx.sock = e.sock    
                                        this.sendCfm(new TcpjsConnUseCfm(FW.ERROR_SUCCESS), e)
                                    }
                                },
                            },
                        },
                        connected: {
                            initial: 'unauth',
                            entry: ({context: ctx, event: e})=>{
                                this.state('connected')
                                ctx.error = null
                                ctx.savedLine = ''
                                ctx.sock.on('data', (buffer)=>{
                                    ctx.savedLine += buffer.toString()
                                    this.log('sock received: ', ctx.savedLine)
                                    let strs = ctx.savedLine.split('\r\n')
                                    fw.assert(strs.length > 0)
                                    let lineCnt = strs.length - 1
                                    for (let i=0; i<lineCnt; i++) {
                                        const msg = createMessageFromJson(strs.shift())
                                        if (msg) {
                                            this.log('msg received: ', msg)
                                            this.send(new SockOnMessage(msg), this.name)
                                        }
                                    }
                                    fw.assert(strs.length == 1)
                                    ctx.savedLine = strs[0]
                                })
                                ctx.sock.on('close', ()=>{
                                    this.log('sock closed')
                                    this.send(new Evt('SockOnClosed', this.name))
                                })
                                ctx.sock.on('error', ()=>{
                                    this.log('sock closed')
                                    this.send(new Evt('SockOnError', this.name))
                                })
                            },
                            on: {
                                SockOnError: {
                                    actions: ({context: ctx, event: e})=> {
                                        this.closeSock()
                                    }
                                }
                            },
                            on: {
                                SockOnClosed: {
                                    target: '#idle',
                                    actions: ({context: ctx, event: e})=> {
                                        this.event(e)
                                        this.sendInd(new TcpjsConnDoneInd(ctx.error || FW.ERROR_NETWORK, this.name, FW.REASON_UNSPEC, ctx.nodeId), ctx.user)
                                    }
                                }
                            },
                            states: {
                                unauth: {
                                    id: 'unauth',
                                    entry: ({context: ctx, event: e})=>{
                                        this.state('auth_unauth')
                                        ctx.authTimer.start(AUTH_TIMEOUT_MS)
                                    },
                                    exit: ({context: ctx, event: e})=>{
                                        ctx.authTimer.stop()
                                    },
                                    on: {
                                        AuthTimer: {
                                            actions: ({context: ctx, event: e})=> {
                                                this.event(e)
                                                ctx.error = FW.ERROR_TIMEOUT
                                                this.closeSock()
                                            }
                                        },
                                        AuthDone: {
                                            target: '#authenticated',
                                            actions: ({context: ctx, event: e})=> {
                                                this.event(e)                            
                                            }
                                        },
                                        SockOnMessage: {
                                            guard: ({context: ctx, event: e})=>(e.msg.type == 'SrvAuthReqMsg'),
                                            actions: ({context: ctx, event: e})=>{
                                                this.event(e)
                                                this.log('SockOnMessage: ', e.msg)
                                                ctx.savedAuthReqMsg = e.msg
                                                this.sendReq(new CmdSrvAuthReq(e.msg.username, e.msg.password, e.msg.nodeId, 'tcpjs'), ctx.user)
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
                                                    ctx.error = e.error
                                                    this.closeSock()
                                                }
                                            }
                                        }
                                    }
                                },
                                authenticated: {
                                    id: 'authenticated',
                                    entry: ({context: ctx, event: e})=>{
                                        this.state('auth_authenticated')
                                        ctx.pingWaitTimer.start(PING_WAIT_TIMEOUT_MS, true)
                                        ctx.pingCnt = 0 
                                        // Test only.
                                        ctx.testTimer.start(TEST_TIMEOUT_MS, false)
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
                                                    ctx.error = FW.ERROR_TIMEOUT
                                                    this.closeSock()
                                                }
                                            }
                                        },
                                        // Test only.
                                        ///*
                                        TestTimer: {
                                            actions: ({context: ctx, event: e})=> {
                                                this.event(e)
                                                this.sendReqMsg(new DispTickerReqMsg({text:'abc', fgColor:{r:0,g:0,b:0}, bgColor:{r:0,g:0,b:0}}, 0), ctx.nodeId)
                                            }
                                        },
                                        //*/
                                        TcpjsConnMsgReq: {
                                            actions: ({context: ctx, event: e})=> {
                                                this.event(e)
                                                this.postMsg(e.msg)
                                            }
                                        },
                                        SockOnMessage: {
                                            actions: ({context: ctx, event: e})=>{
                                                this.event(e)
                                                //this.log('SockOnMessage: ', e.msg)
                                                if (e.msg.type == 'SrvPingReqMsg') {
                                                    ctx.pingCnt++
                                                    this.sendCfmMsg(new SrvPingCfmMsg(), e.msg)
                                                ///*    
                                                } else if (e.msg.type == 'DispTickerCfmMsg') {
                                                    // Test only.
                                                    ctx.testTimer.start(TEST_TIMEOUT_MS, false)
                                                //*/    
                                                } else {
                                                    this.sendInd(new TcpjsConnMsgInd(e.msg), ctx.user)                                                        }
                                            }
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
    closeSock() {
        // end() half-closes the connection.
        this.ctx.sock.end()
        // Forces connection to close in case client does not finish it. 
        this.ctx.sock.destroy()
    }
    postMsg(m) {
        this.log('postMsg: ', m)
        try {
            this.ctx.sock.write(JSON.stringify(m) + '\r\n')
        } catch(e) {
            this.log("sock.write() failed: ", e)
        }
    }
    sendReqMsg(m, to, group) { super.sendReq_((m)=>this.postMsg(m), m, to, group, this.ctx.srvId) }
    sendCfmMsg(m, req) { super.sendCfm_((m)=>this.postMsg(m), m, req, this.ctx.srvId) }
    sendIndMsg(m, to, group) { this.sendReqMsg(m, to, group) }
    sendRspMsg(m, req) { this.sendCfmMsg(m, req) }
}

module.exports = {
    TcpjsConn
}
