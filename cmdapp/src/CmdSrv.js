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

let {Evt, ErrorEvt, fw, FW, Hsm, Timer, log} = require("../../galliumio/lib/index.js")
let {CmdSrvStartReq, CmdSrvStartCfm, CmdSrvStopReq, CmdSrvStopCfm, CmdSrvAuthReq, CmdSrvAuthCfm} = require("./CmdSrvInterface.js")
let {WsConnStartReq, WsConnStopReq, WsConnUseReq, WsConnMsgReq} = require("./WsConnInterface.js")
let {TcpConnStartReq, TcpConnStopReq, TcpConnUseReq, TcpConnMsgReq} = require("./TcpConnInterface.js")
let {TcpjsConnStartReq, TcpjsConnStopReq, TcpjsConnUseReq, TcpjsConnMsgReq} = require("./TcpjsConnInterface.js")
let {CliConnStartReq, CliConnStopReq, CliConnUseReq, CliConnMsgReq} = require("./CliConnInterface.js")
let {ConnSts, SrvConnStsIndMsg} = require('../msg/SrvMsgInterface.js')  
let {app, APP} = require("./App.js")
let WebSocket = require('ws')
let net = require('net')
let express = require("express")
let http = require("http")

// Application constants.
const HTTP_PORT = 60000
const HTTP_PORT_PY = 60001      // For launching brython web application.
const TCP_PORT = 60002
const TCPJS_PORT = 60003
const CLI_PORT = 60004

// Timeout periods.
const STARTING_TIMEOUT_MS = 500
const STOPPING_TIMEOUT_MS = 500

// Internal events
class Fail extends ErrorEvt {
    constructor(error = FW.ERROR_UNSPEC, origin = FW.UNDEF, reason = FW.REASON_UNSPEC) {
        super('Fail', FW.UNDEF, FW.UNDEF, 0, error, origin, reason)
    }
}

class WsConnected extends Evt {
    constructor(to, ws) {
        super('WsConnected', to)
        this.ws = ws
    }
}

class TcpConnected extends Evt {
    constructor(to, sock) {
        super('TcpConnected', to)
        this.sock = sock 
    }
}

class TcpjsConnected extends Evt {
    constructor(to, sock) {
        super('TcpjsConnected', to)
        this.sock = sock 
    }
}

class CliConnected extends Evt {
    constructor(to, sock) {
        super('CliConnected', to)
        this.sock = sock 
    }
}

// Internal event.
class AuthSuccess extends Evt {
    constructor(connSts) {
        super('AuthSuccess', connSts)
        this.connSts = connSts 
    }
}

// Helper functions
function arrayMove(from, to, item) {
    let idx = from.indexOf(item)
    fw.assert(idx >= 0)
    from.splice(idx, 1)
    fw.assert(to.indexOf(item) == -1)
    to.push(item);
}

class CmdSrv extends Hsm {
    constructor(name) {
        let ctx = {
            savedStartReq: null,
            savedStopReq: null,
            savedAuthReg: null,
            startingTimer: new Timer(name, "StartingTimer"),
            stoppingTimer: new Timer(name, "StoppingTimer"),

            expressApp: null,
            httpServer: null,
            wsServer: null,
            expressPyApp: null,     // For brython.
            httpPyServer: null,     // For brython.
            wsPyServer: null,       // For brython.
            tcpServer: null,
            tcpjsServer: null,
            cliServer: null,
            srvId: 'Srv',            

            // Objects containing free, pending and busy lists.
            wsConnList: null,
            tcpConnList: null,
            tcpjsConnList: null,
            cliConnList: null,
            // Map of connected nodes (nodeId -> connSts)
            nodeMap: new Map(),
        }
        let config = {
            initial: 'stopped',
            on: { 
                CmdSrvStartReq: {
                    actions: (ctx, e)=> { 
                        this.event(e)
                        this.sendCfm(new CmdSrvStartCfm(FW.ERROR_STATE, this.name), e)
                    }
                },
                CmdSrvStopReq: {
                    target: 'stopping',
                    internal: true,
                    actions: (ctx, e)=>{
                        this.event(e)
                        ctx.savedStopReq = e
                    }
                }
            },
            states: {
                stopped: {
                    onEntry: (ctx, e)=>{ 
                        this.state('stopped') 
                        ctx.wsConnList = {
                            free: [],
                            busy: []
                        }
                        ctx.tcpConnList = {
                            free: [],
                            busy: []
                        }
                        ctx.tcpjsConnList = {
                            free: [],
                            busy: []
                        }
                        ctx.cliConnList = {
                            free: [],
                            busy: []
                        }
                    },
                    on: { 
                        CmdSrvStopReq: {
                            actions: (ctx, e)=> { 
                                this.event(e)
                                this.sendCfm(new CmdSrvStopCfm(), e)
                            }
                        },
                        CmdSrvStartReq: {
                            target: 'starting',
                            actions: (ctx, e)=> { 
                                this.event(e)
                                ctx.savedStartReq = e
                            }
                        }
                    },
                },
                starting: {
                    onEntry: (ctx, e)=>{ 
                        this.state('starting')
                        ctx.startingTimer.start(STARTING_TIMEOUT_MS)
                        for (let i=0; i<APP.WS_CONN_CNT; i++) {
                            this.sendReq(new WsConnStartReq(), app.wsConn(i))
                        }
                        for (let i=0; i<APP.TCP_CONN_CNT; i++) {
                            this.sendReq(new TcpConnStartReq(), app.tcpConn(i))
                        }
                        for (let i=0; i<APP.TCPJS_CONN_CNT; i++) {
                            this.sendReq(new TcpjsConnStartReq(), app.tcpjsConn(i))
                        }
                        for (let i=0; i<APP.CLI_CONN_CNT; i++) {
                            this.sendReq(new CliConnStartReq(), app.cliConn(i))
                        }
                    },
                    onExit: (ctx, e)=>{ 
                        ctx.startingTimer.stop()
                    },
                    on: { 
                        StartingTimer: {
                            target: 'stopping',
                            actions: (ctx, e)=> { 
                                this.event(e)
                                this.sendCfm(new CmdSrvStartCfm(FW.ERROR_TIMEOUT, this.name), ctx.savedStartReq)
                            }
                        },
                        Fail: {
                            target: 'stopping',
                            actions: (ctx, e)=> { 
                                this.event(e)
                                this.sendCfm(new CmdSrvStartCfm(e.error, e.origin, e.reason), ctx.savedStartReq)
                            }
                        },
                        Done: {
                            target: 'started',
                            actions: (ctx, e)=> { 
                                this.sendCfm(new CmdSrvStartCfm(FW.ERROR_SUCCESS), ctx.savedStartReq)
                            }
                        },
                        WsConnStartCfm: {
                            cond: (ctx, e)=>this.matchSeq(e),
                            actions: (ctx, e)=>{ this.handleConnStartCfm(e, ctx.wsConnList) }
                        },
                        TcpConnStartCfm: {
                            cond: (ctx, e)=>this.matchSeq(e),
                            actions: (ctx, e)=>{ this.handleConnStartCfm(e, ctx.tcpConnList) }
                        },
                        TcpjsConnStartCfm: {
                            cond: (ctx, e)=>this.matchSeq(e),
                            actions: (ctx, e)=>{ this.handleConnStartCfm(e, ctx.tcpjsConnList) }
                        },
                        CliConnStartCfm: {
                            cond: (ctx, e)=>this.matchSeq(e),
                            actions: (ctx, e)=>{ this.handleConnStartCfm(e, ctx.cliConnList) }
                        }
                    },
                }, 
                stopping: {
                    onEntry: (ctx, e)=>{ 
                        this.state('stopping') 
                        ctx.stoppingTimer.start(STOPPING_TIMEOUT_MS)
                        for (let i=0; i<APP.WS_CONN_CNT; i++) {
                            this.sendReq(new WsConnStopReq(), app.wsConn(i))
                        }
                        for (let i=0; i<APP.TCP_CONN_CNT; i++) {
                            this.sendReq(new TcpConnStopReq(), app.tcpConn(i))
                        }
                        for (let i=0; i<APP.TCPJS_CONN_CNT; i++) {
                            this.sendReq(new TcpjsConnStopReq(), app.tcpjsConn(i))
                        }
                        for (let i=0; i<APP.CLI_CONN_CNT; i++) {
                            this.sendReq(new CliConnStopReq(), app.cliConn(i))
                        }
                    },
                    onExit: (ctx, e)=>{ 
                        ctx.stoppingTimer.stop()
                        this.recall()
                    },
                    on: { 
                        StoppingTimer: {
                            actions: (ctx, e)=> { 
                                this.event(e)
                                fw.assert(0)
                            }
                        },
                        Fail: {
                            actions: (ctx, e)=> { 
                                this.event(e)
                                fw.assert(0)
                            }
                        },
                        Done: {
                            target: 'stopped',
                            actions: (ctx, e)=> { 
                                this.sendCfm(new CmdSrvStopCfm(FW.ERROR_SUCCESS), ctx.savedStopReq)
                            }
                        },
                        WsConnStopCfm: {
                            cond: (ctx, e)=>this.matchSeq(e),
                            actions: (ctx, e)=>{ this.handleConnStopCfm(e) }
                        },
                        TcpConnStopCfm: {
                            cond: (ctx, e)=>this.matchSeq(e),
                            actions: (ctx, e)=>{ this.handleConnStopCfm(e) }
                        },
                        TcpjsConnStopCfm: {
                            cond: (ctx, e)=>this.matchSeq(e),
                            actions: (ctx, e)=>{ this.handleConnStopCfm(e) }
                        },
                        CliConnStopCfm: {
                            cond: (ctx, e)=>this.matchSeq(e),
                            actions: (ctx, e)=>{ this.handleConnStopCfm(e) }
                        },
                        CmdSrvStopReq: {
                            actions: (ctx, e)=>{
                                this.event(e)
                                this.defer(e)
                            }
                        }
                    },                    
                },
                started: {
                    type: 'parallel',
                    states: {
                        conn_root: {
                            onEntry: (ctx, e)=>{ 
                                this.state('conn_root')

                                // For main react-based web application.
                                ctx.expressApp = express()
                                ctx.httpServer = http.createServer(ctx.expressApp);
                                ctx.httpServer.listen(HTTP_PORT)
                                ctx.wsServer = new WebSocket.Server({server: ctx.httpServer});
                                ctx.wsServer.on('connection', (ws, req)=>{ 
                                    this.log(`ws connected from ${req.headers['x-forwarded-for'] || req.connection.remoteAddress}`)
                                    // Must not use raise() since it is a callback called asynchronously.
                                    this.send(new WsConnected(this.name, ws))
                                })
                                let app = ctx.expressApp
                                app.get('/hello', function(req, res){ res.type('text/plain'); res.send('Hello World!!!');});
                                app.use(express.static('../public'))

                                // For brython (browser python) web application.
                                ctx.expressPyApp = express()
                                ctx.httpPyServer = http.createServer(ctx.expressPyApp);
                                ctx.httpPyServer.listen(HTTP_PORT_PY)
                                ctx.wsPyServer = new WebSocket.Server({server: ctx.httpPyServer});
                                ctx.wsPyServer.on('connection', (ws, req)=>{ 
                                    this.log(`ws connected from ${req.headers['x-forwarded-for'] || req.connection.remoteAddress}`)
                                    // Must not use raise() since it is a callback called asynchronously.
                                    this.send(new WsConnected(this.name, ws))
                                })
                                let pyApp = ctx.expressPyApp
                                pyApp.get('/hello', function(req, res){ res.type('text/plain'); res.send('Hello World Python!!!');});
                                pyApp.use(express.static('../public-python'))

                                ctx.tcpServer = net.createServer()
                                ctx.tcpServer.listen(TCP_PORT)
                                ctx.tcpServer.on('connection', (sock)=>{
                                    // Note there seems no way to get the headers['x-forwarded-for'] to find out the real IP address.
                                    this.log(`tcp socket connected`)
                                    this.send(new TcpConnected(this.name, sock))
                                })
                                ctx.tcpjsServer = net.createServer()
                                ctx.tcpjsServer.listen(TCPJS_PORT)
                                ctx.tcpjsServer.on('connection', (sock)=>{
                                    // Note there seems no way to get the headers['x-forwarded-for'] to find out the real IP address.
                                    this.log(`tcpjs (JSON) socket connected`)
                                    this.send(new TcpjsConnected(this.name, sock))
                                })
                                ctx.cliServer = net.createServer()
                                ctx.cliServer.listen(CLI_PORT)
                                ctx.cliServer.on('connection', (sock)=>{
                                    // Note there seems no way to get the headers['x-forwarded-for'] to find out the real IP address.
                                    this.log(`cli socket connected`)
                                    this.send(new CliConnected(this.name, sock))
                                })
                            },
                            on: { 
                                WsConnected: {
                                    actions: (ctx, e)=> { 
                                        this.event(e)
                                        if (ctx.wsConnList.free.length == 0) {
                                            this.error('No wsConn availabled. Rejected')
                                            e.ws.close()
                                        } else {
                                            let conn = ctx.wsConnList.free.shift()
                                            ctx.wsConnList.busy.push(conn)
                                            this.log(`Using ${conn} for ws connection`)
                                            this.log(`busy wsConn = ${ctx.wsConnList.busy}`)
                                            this.sendReq(new WsConnUseReq(e.ws), conn)
                                        }
                                    }
                                },
                                WsConnDoneInd: {
                                    actions: (ctx, e)=>{
                                        this.event(e)
                                        arrayMove(ctx.wsConnList.busy, ctx.wsConnList.free, e.from)
                                        this.log(`busy wsConn = ${ctx.wsConnList.busy}`)
                                        // Note it is okay if nodeMap does not contain the nodeId to remove.
                                        if (ctx.nodeMap.delete(e.nodeId)) {
                                            this.log(ctx.nodeMap)
                                            // Send SrvConnStsInd to all nodes.
                                            this.forAllNodes((nodeId)=>{
                                                this.sendIndMsg(new SrvConnStsIndMsg([...ctx.nodeMap.values()]), nodeId)
                                            })
                                        }
                                    }
                                },
                                TcpConnected: {
                                    actions: (ctx, e)=> { 
                                        this.event(e)
                                        if (ctx.tcpConnList.free.length == 0) {
                                            this.error('No tcpConn availabled. Rejected')
                                            e.sock.end()
                                            e.sock.destroy()
                                        } else {
                                            let conn = ctx.tcpConnList.free.shift()
                                            ctx.tcpConnList.busy.push(conn)
                                            this.log(`Using ${conn} for tcp connection`)
                                            this.log(`busy tcpConn = ${ctx.tcpConnList.busy}`)
                                            this.sendReq(new TcpConnUseReq(e.sock), conn)
                                        }
                                    }
                                },
                                TcpConnDoneInd: {
                                    actions: (ctx, e)=>{
                                        this.event(e)
                                        arrayMove(ctx.tcpConnList.busy, ctx.tcpConnList.free, e.from)
                                        this.log(`busy tcpConn = ${ctx.tcpConnList.busy}`)
                                        // Note it is okay if nodeMap does not contain the nodeId to remove.
                                        if (ctx.nodeMap.delete(e.nodeId)) {
                                            this.log(ctx.nodeMap)
                                            // Send SrvConnStsInd to all nodes.
                                            this.forAllNodes((nodeId)=>{
                                                this.sendIndMsg(new SrvConnStsIndMsg([...ctx.nodeMap.values()]), nodeId)
                                            })
                                        }
                                    }
                                },
                                TcpjsConnected: {
                                    actions: (ctx, e)=> { 
                                        this.event(e)
                                        if (ctx.tcpjsConnList.free.length == 0) {
                                            this.error('No tcpjsConn availabled. Rejected')
                                            e.sock.end()
                                            e.sock.destroy()
                                        } else {
                                            let conn = ctx.tcpjsConnList.free.shift()
                                            ctx.tcpjsConnList.busy.push(conn)
                                            this.log(`Using ${conn} for tcpjs connection`)
                                            this.log(`busy tcpjsConn = ${ctx.tcpjsConnList.busy}`)
                                            this.sendReq(new TcpjsConnUseReq(e.sock), conn)
                                        }
                                    }
                                },
                                TcpjsConnDoneInd: {
                                    actions: (ctx, e)=>{
                                        this.event(e)
                                        arrayMove(ctx.tcpjsConnList.busy, ctx.tcpjsConnList.free, e.from)
                                        this.log(`busy tcpjsConn = ${ctx.tcpjsConnList.busy}`)
                                        // Note it is okay if nodeMap does not contain the nodeId to remove.
                                        if (ctx.nodeMap.delete(e.nodeId)) {
                                            this.log(ctx.nodeMap)
                                            // Send SrvConnStsInd to all nodes.
                                            this.forAllNodes((nodeId)=>{
                                                this.sendIndMsg(new SrvConnStsIndMsg([...ctx.nodeMap.values()]), nodeId)
                                            })
                                        }
                                    }
                                },
                                CliConnected: {
                                    actions: (ctx, e)=> { 
                                        this.event(e)
                                        if (ctx.cliConnList.free.length == 0) {
                                            this.error('No cliConn availabled. Rejected')
                                            e.sock.end()
                                            e.sock.destroy()
                                        } else {
                                            let conn = ctx.cliConnList.free.shift()
                                            ctx.cliConnList.busy.push(conn)
                                            this.log(`Using ${conn} for cli connection`)
                                            this.log(`busy cliConn = ${ctx.cliConnList.busy}`)
                                            this.sendReq(new CliConnUseReq(e.sock), conn)
                                        }
                                    }
                                },
                                CliConnDoneInd: {
                                    actions: (ctx, e)=>{
                                        this.event(e)
                                        arrayMove(ctx.cliConnList.busy, ctx.cliConnList.free, e.from)
                                        this.log(`busy cliConn = ${ctx.cliConnList.busy}`)
                                        // Note it is okay if nodeMap does not contain the nodeId to remove.
                                        if (ctx.nodeMap.delete(e.nodeId)) {
                                            this.log(ctx.nodeMap)
                                            // Send SrvConnStsInd to all nodes.
                                            this.forAllNodes((nodeId)=>{
                                                this.sendIndMsg(new SrvConnStsIndMsg([...ctx.nodeMap.values()]), nodeId)
                                            })
                                        }
                                    }
                                },
                                AuthSuccess: {
                                    actions: (ctx, e)=>{
                                        this.event(e)
                                        let {nodeId, hsm} = e.connSts
                                        this.log(e)
                                        // @todo Consider changing the following assert to disconnecting.
                                        //       Shouldn't happen if unique nodeId's are guaranteed in the auth region.
                                        fw.assert(!ctx.nodeMap.has(nodeId))
                                        fw.assert(ctx.wsConnList.busy.includes(hsm) || ctx.tcpConnList.busy.includes(hsm) ||
                                                  ctx.tcpjsConnList.busy.includes(hsm) || ctx.cliConnList.busy.includes(hsm))
                                        ctx.nodeMap.set(nodeId, e.connSts)
                                        this.log(ctx.nodeMap)
                                        // Send SrvConnStsInd to all nodes.
                                        this.forAllNodes((nodeId)=>{
                                            this.sendIndMsg(new SrvConnStsIndMsg([...ctx.nodeMap.values()]), nodeId)
                                        })
                                    }
                                },   
                                WsConnMsgInd: {
                                    actions: (ctx, e)=>{
                                        this.event(e)
                                        this.log('WsConnMsgInd: ', e.msg)
                                        this.routeMsg(e.msg)
                                    }
                                },
                                TcpConnMsgInd: {
                                    actions: (ctx, e)=>{
                                        this.event(e)
                                        this.log('TcpConnMsgInd: ', e.msg)
                                        this.routeMsg(e.msg)
                                    }
                                },     
                                TcpjsConnMsgInd: {
                                    actions: (ctx, e)=>{
                                        this.event(e)
                                        this.log('TcpjsConnMsgInd: ', e.msg)
                                        this.routeMsg(e.msg)
                                    }
                                },
                                CliConnMsgInd: {
                                    actions: (ctx, e)=>{
                                        this.event(e)
                                        this.log('CliConnMsgInd: ', e.msg)
                                        this.routeMsg(e.msg)
                                    }
                                }
                            } 
                        },
                        auth_root: {
                            initial: 'auth_idle',
                            onEntry: (ctx, e)=>{ 
                                this.state('auth_root')
                            },
                            states: {
                                auth_idle: {
                                    id: 'auth_idle',
                                    onEntry: (ctx, e)=>{ 
                                        this.state('auth_idle')
                                    },
                                    on: {
                                        CmdSrvAuthReq: {
                                            target: '#auth_busy',
                                            actions: (ctx, e)=>{
                                                this.event(e),
                                                ctx.savedAuthReg = e
                                            }
                                        }
                                    }
                                },
                                auth_busy: {
                                    id: 'auth_busy',
                                    onEntry: (ctx, e)=>{ 
                                        this.state('auth_busy')
                                        let req = ctx.savedAuthReg                                      
                                        if (this.checkCredential(req.username, req.password)) {
                                            let nodeId = req.nodeId
                                            if (nodeId == FW.UNDEF) {
                                                // Assigns default (@todo use uuid)
                                                nodeId = 'Node_' + req.from
                                            }
                                            // Appends '_' to avoid duplicate ID.
                                            while (ctx.nodeMap.has(nodeId)) {
                                                nodeId = `${nodeId}_`
                                            }
                                            // Note we must get fields from "req" before it is "confirmed" since sendCfm() auto-clears req.
                                            this.raise(new AuthSuccess(new ConnSts(nodeId, req.username, req.from, req.connType)))
                                            this.sendCfm(new CmdSrvAuthCfm(FW.ERROR_SUCCESS, FW.UNDEF, FW.REASON_UNSPEC, nodeId), req)
                                        } else {
                                            this.sendCfm(new CmdSrvAuthCfm(FW.ERROR_AUTH, this.name), req)
                                        }
                                        this.raise(new Evt('AuthDone'))
                                    },
                                    onExit: (ctx, e)=>{
                                        this.recall('auth')
                                    },
                                    on: {
                                        AuthDone: {
                                            target: '#auth_idle'
                                        },
                                        CmdSrvAuthReq: {
                                            actions: (ctx, e)=>{
                                                this.event(e),
                                                this.defer(e, 'auth')
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

    // Member functions.
    handleConnStartCfm(e, connList) {
        this.event(e)
        if (e.error !== FW.ERROR_SUCCESS) {
            this.raise(new Fail(e.error, e.origin, e.reason))
        } else {
            if (this.clearSeq(e)) {
                this.raise(new Evt('Done'))
            }
            connList.free.push(e.from)
        }
    }
    handleConnStopCfm(e) {
        this.event(e)
        if (e.error !== FW.ERROR_SUCCESS) {
            this.raise(new Fail(e.error, e.origin, e.reason))
        } else {
            if (this.clearSeq(e)) {
                this.raise(new Evt('Done'))
            }
        }
    }
    routeMsg(m) {
        if (m.to == this.ctx.srvId) {
            // @todo Add publish-subscribe support.
            //       Now sends to all except sender.
            this.postMsgAll(m)
        } else {
            this.postMsg(m)
        }
    }
    postMsg(m) {
        // Destructuring throw exception on null/undefined object, but {} is fine.
        let {hsm, connType} = this.ctx.nodeMap.get(m.to) || {}
        this.sendMsgToConn(m, connType, hsm)
    }
    // Post msg to all nodes (except sender).
    postMsgAll(m) {
        this.forAllNodes((nodeId, connSts)=> {
            if (nodeId != m.from) {
                let {nodeId, hsm, connType} = connSts
                m.to = nodeId
                this.sendMsgToConn(m, connType, hsm)
            }
        })
    }
    // Helper function to send a message to a node via the specified hsm.
    sendMsgToConn(m, connType, hsm) {
        if (connType == 'ws') {
            this.sendReq(new WsConnMsgReq(m), hsm)
        } else if (connType == 'tcp') {
            this.sendReq(new TcpConnMsgReq(m), hsm)
        } else if (connType == 'tcpjs') {
            this.sendReq(new TcpjsConnMsgReq(m), hsm)
        } else if (connType == 'cli') {
            this.sendReq(new CliConnMsgReq(m), hsm)
        } else {
            this.log(`sendMsgToConn - invalid connType ${connType} msg=${m}`)
        }
    }

    sendReqMsg(m, to, group) { super.sendReq_((m)=>this.postMsg(m), m, to, group, this.ctx.srvId) }
    sendCfmMsg(m, req) { super.sendCfm_((m)=>this.postMsg(m), m, req, this.ctx.srvId) }
    sendIndMsg(m, to, group) { this.sendReqMsg(m, to, group) }
    sendRspMsg(m, req) { this.sendCfmMsg(m, req) }

    // Helper function to iterate over all nodes.
    forAllNodes(action) {
        for (let [nodeId, connSts] of this.ctx.nodeMap) {
            action(nodeId, connSts)
        } 
    }

    checkCredential(username, password) {
        //@todo Verify credential
        this.log(`Verifying ${username}:${password}`)
        if (username === 'user' && password === 'pwd') {
            this.log('    pass!')
            return true
        }
        this.log('  failed!')
        return false
    }
}

module.exports = {
    CmdSrv
 }