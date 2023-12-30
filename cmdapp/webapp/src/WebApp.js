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

import React from 'react'
import { render } from 'react-dom'
import {ScreenFlow} from './components/ScreenFlow'
import {MAIN_TAB} from './components/MainScreen'

let {Evt, ErrorEvt, fw, FW, Hsm, Timer, log} = require("../../../galliumstudio/lib/index.js")
let {WebAppStartReq, WebAppStartCfm, WebAppStopReq, WebAppStopCfm} = require("./WebAppInterface.js")
let {WsCtrlStartReq, WsCtrlStartCfm, WsCtrlStopReq, WsCtrlStopCfm, WsCtrlOpenReq, WsCtrlOpenCfm, 
    WsCtrlCloseReq, WsCtrlCloseCfm, WsCtrlCloseInd, WsCtrlMsgReq, WsCtrlMsgInd} = require("./WsCtrlInterface.js")
const {SrvConnStsIndMsg} = require('../../msg/SrvMsgInterface.js')
const {DispTickerReqMsg} = require('../../msg/DispMsgInterface.js')
const {SensorControlReqMsg} = require('../../msg/SensorMsgInterface.js')

// Timeout periods.
const STARTING_TIMEOUT_MS = 500
const STOPPING_TIMEOUT_MS = 500
const LOGIN_TIMEOUT_MS = 1000
const RETRY_TIMEOUT_MS = 100        // Can make it longer to avoid retrying to login too quickly
const LED_PANEL_WAIT_TIMEOUT_MS = 3000

// Internal events
class Fail extends ErrorEvt {
    constructor(error = FW.ERROR_UNSPEC, origin = FW.UNDEF, reason = FW.REASON_UNSPEC) {
        super('Fail', FW.UNDEF, FW.UNDEF, 0, error, origin, reason)
    }
}

export class WebApp extends Hsm {
    constructor(name) {
        let ctx = {
            savedStartReq: null,
            savedStopReq: null,
            startingTimer: new Timer(name, "StartingTimer"),
            stoppingTimer: new Timer(name, "StoppingTimer"),
            loginTimer: new Timer(name, "LoginTimer"),
            retryTimer: new Timer(name, "RetryTimer"),
            waitTimer: new Timer(name, "WaitTimer"),
            nodesToSend: null,  // General list of nodes to send message to (refernce to array).
            msgSeqMap: new Map(),
            // LedPanelTab
            tickerData: null,   // Ticker data being sent to nodes (reference to array of objects).
            tickerIdx: 0,       // Index to entries to tickerData being sent. 

            model: {
                testButtonClickCnt: 0,
                screen: 'blank',                // Screen being shown, e.g. 'blank', 'testOnly', 'login', 'main'
                disableUi: false,
                mainTabIndex: MAIN_TAB.STATUS,  // 0-based index to tabs on main screen.
                username: 'user',               // Login credential
                password: 'pwd',                // Login credential
                mainStatusData: [],             // Main status data to be displayed.
                sensorData: new Map(),          // Map from nodeId to sensor data object per sensor node.
            },
        }
        let config = {
            initial: 'stopped',
            on: { 
                WebAppStartReq: {
                    actions: ({context: ctx, event: e})=> { 
                        this.event(e)
                        this.sendCfm(new WebAppStartCfm(FW.ERROR_STATE, this.name), e)
                    }
                },
                WebAppStopReq: {
                    target: '#stopping',
                    actions: ({context: ctx, event: e})=>{
                        this.event(e)
                        ctx.savedStopReq = e
                    }
                }
            },
            states: {
                stopped: {
                    entry: ({context: ctx, event: e})=>{ 
                        this.state('stopped') 
                    },
                    on: { 
                        WebAppStopReq: {
                            actions: ({context: ctx, event: e})=> { 
                                this.event(e)
                                this.sendCfm(new WebAppStopCfm(), e)
                            }
                        },
                        WebAppStartReq: {
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
                        this.sendReq(new WsCtrlStartReq(), 'WsCtrl')
                    },
                    exit: ({context: ctx, event: e})=>{ 
                        ctx.startingTimer.stop()
                    },
                    on: { 
                        StartingTimer: {
                            target: '#stopping',
                            actions: ({context: ctx, event: e})=> { 
                                this.event(e)
                                this.sendCfm(new WebAppStartCfm(FW.ERROR_TIMEOUT, this.name), ctx.savedStartReq)
                            }
                        },
                        Fail: {
                            target: '#stopping',
                            actions: ({context: ctx, event: e})=> { 
                                this.event(e)
                                this.sendCfm(new WebAppStartCfm(e.error, e.origin, e.reason), ctx.savedStartReq)
                            }
                        },
                        Done: {
                            target: 'started',
                            actions: ({context: ctx, event: e})=> { 
                                this.sendCfm(new WebAppStartCfm(FW.ERROR_SUCCESS), ctx.savedStartReq)
                            }
                        },
                        WsCtrlStartCfm: {
                            guard: ({context: ctx, event: e})=>this.matchSeq(e),
                            actions: ({context: ctx, event: e})=>{
                                this.event(e)
                                if (e.error !== FW.ERROR_SUCCESS) {
                                    this.raise(new Fail(e.error, e.origin, e.reason))
                                } else {
                                    if (this.clearSeq(e)) {
                                        this.raise(new Evt('Done'))
                                    }
                                }
                            }
                        }
                    },
                }, 
                stopping: {
                    id: 'stopping',
                    entry: ({context: ctx, event: e})=>{ 
                        this.state('stopping') 
                        ctx.stoppingTimer.start(STOPPING_TIMEOUT_MS)
                        this.sendReq(new WsCtrlStopReq(), 'WsCtrl')
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
                                this.sendCfm(new WebAppStopCfm(FW.ERROR_SUCCESS), ctx.savedStopReq)
                            }
                        },
                        WsCtrlStopCfm: {
                            guard: ({context: ctx, event: e})=>this.matchSeq(e),
                            actions: ({context: ctx, event: e})=>{
                                this.event(e)
                                if (e.error !== FW.ERROR_SUCCESS) {
                                    this.raise(new Fail(e.error, e.origin, e.reason))
                                } else {
                                    if (this.clearSeq(e)) {
                                        this.raise(new Evt('Done'))
                                    }
                                }
                            }
                        },
                        WebAppStopReq: {
                            actions: ({context: ctx, event: e})=>{
                                this.event(e)
                                this.defer(e)
                            }
                        }
                    },                    
                },
                started: {
                    initial: 'login',
                    entry: ({context: ctx, event: e})=>{ 
                        this.state('started')
                        this.update()
                     },
                     exit: ({context: ctx, event: e})=>{ 
                        this.sendReq(new WsCtrlCloseReq(), 'WsCtrl')
                     },
                     on: { 
                        TestButtonClicked: {
                            actions: ({context: ctx, event: e})=> { 
                                this.event(e)
                                ctx.model.testButtonClickCnt++
                                this.update()
                            }
                        },
                        WsCtrlCloseInd: {
                            target: '#login',
                            actions: ({context: ctx, event: e})=> { 
                                this.event(e)
                            }
                        },
                    },
                    states: {
                        login: {
                            id: 'login',
                            entry: ({context: ctx, event: e})=>{ 
                                this.state('login')
                                ctx.model.screen = 'login'
                                this.update()
                            },
                            on: {
                                LoginButtonClicked: {
                                    target: 'loginWait',
                                    actions: ({context: ctx, event: e})=>{
                                        this.event(e)
                                        this.log(`${e.username} ${e.password}`)
                                        ctx.model.username = e.username
                                        ctx.model.password = e.password
                                    }
                                }
                            }
                        },
                        loginWait: {
                            entry: ({context: ctx, event: e})=>{ 
                                this.state('loginWait')
                                ctx.model.disableUi = true
                                this.update()
                                // It works for both http and https, since 'http' will be relaced with 'ws'
                                // and 'https' will be replaced with 'wss'.
                                let url = window.location.href.replace(/^http/, 'ws')
                                this.sendReq(new WsCtrlOpenReq(url, ctx.model.username, ctx.model.password), 'WsCtrl')
                                ctx.loginTimer.start(LOGIN_TIMEOUT_MS)
                            },
                            exit: ({context: ctx, event: e})=>{ 
                                ctx.loginTimer.stop()
                                ctx.model.disableUi = false
                                this.update()
                            },
                            on: { 
                                WsCtrlOpenCfm: [
                                    {
                                        guard: ({context: ctx, event: e})=>this.matchSeq(e) && (e.error != FW.ERROR_SUCCESS),
                                        target: 'retryWait',
                                        actions: ({context: ctx, event: e})=>{ this.event(e) }
                                    },
                                    {
                                        guard: ({context: ctx, event: e})=>this.matchSeq(e) && (e.error == FW.ERROR_SUCCESS),
                                        target: 'connected',
                                        actions: ({context: ctx, event: e})=>{ this.event(e) }
                                    }
                                ],
                                LoginTimer: {
                                    target: 'retryWait',
                                    actions: ({context: ctx, event: e})=>{ this.event(e) }
                                },
                            }
                        },
                        retryWait: {
                            entry: ({context: ctx, event: e})=>{ 
                                this.state('retryWait')
                                ctx.retryTimer.start(RETRY_TIMEOUT_MS)
                            },
                            exit: ({context: ctx, event: e})=>{ 
                                ctx.retryTimer.stop()
                             },
                            on: { 
                                RetryTimer: 'login'
                            }
                        },
                        connected: {
                            initial: 'statusTab',
                            entry: ({context: ctx, event: e})=>{ 
                                this.state('connected')
                                ctx.model.screen = 'main'
                                ctx.model.mainStatusData = []
                                // Note - No need to call "this.update()" yet. It will be called
                                //        upon entry to substate.
                            },
                            on: {
                                MainTabChanged: [
                                    {
                                        guard: ({context: ctx, event: e})=>(e.index == MAIN_TAB.STATUS),
                                        target: '#statusTab',
                                        actions: ({context: ctx, event: e})=>{ this.event(e) }
                                    },
                                    {
                                        guard: ({context: ctx, event: e})=>(e.index == MAIN_TAB.CONSOLE),
                                        target: '#consoleTab',
                                        actions: ({context: ctx, event: e})=>{ this.event(e) }
                                    },
                                    {
                                        guard: ({context: ctx, event: e})=>(e.index == MAIN_TAB.SENSOR),
                                        target: '#sensorTab',
                                        actions: ({context: ctx, event: e})=>{ this.event(e) }
                                    },
                                    {
                                        guard: ({context: ctx, event: e})=>(e.index == MAIN_TAB.LED_PANEL),
                                        target: '#ledPanelTab',
                                        actions: ({context: ctx, event: e})=>{ this.event(e) }
                                    },
                                ],
                                WsCtrlMsgInd: {
                                    guard: ({context: ctx, event: e})=>(e.msg.type == 'SrvConnStsIndMsg'),
                                    actions: ({context: ctx, event: e})=>{ 
                                        this.event(e)
                                        this.log(`Received ${e.msg.type}:`)
                                        this.log(e.msg)
                                        ctx.model.mainStatusData = [...e.msg.status]
                                        // Purge sensorData to remove entries of disconnected nodes.
                                        const connIds = ctx.model.mainStatusData.map(status=>status.nodeId)
                                        const deleteIds = [...ctx.model.sensorData.keys()].filter(nodeId=>!connIds.includes(nodeId))
                                        deleteIds.forEach(nodeId=>ctx.model.sensorData.delete(nodeId))
                                        // Updates display as many screens depend on current conn status.
                                        this.update()
                                    }
                                },
                            },
                            states: {
                                statusTab: {
                                    id: 'statusTab',
                                    entry: ({context: ctx, event: e})=>{
                                        this.state('statusTab')
                                        ctx.model.mainTabIndex = MAIN_TAB.STATUS
                                        this.update()
                                    },
                                },
                                consoleTab: {
                                    id: 'consoleTab',
                                    entry: ({context: ctx, event: e})=>{
                                        this.state('consoleTab')
                                        ctx.model.mainTabIndex = MAIN_TAB.CONSOLE
                                        this.update()
                                    }
                                },
                                sensorTab: {
                                    id: 'sensorTab',
                                    entry: ({context: ctx, event: e})=>{
                                        this.state('sensorTab')
                                        ctx.model.mainTabIndex = MAIN_TAB.SENSOR
                                        ctx.model.sensorData.clear()
                                        this.update()
                                    },
                                    on: {
                                        SensorSendClicked: {
                                            actions: ({context: ctx, event: e})=>{
                                                this.event(e)
                                                this.log(e.nodes)
                                                let seq = 0;
                                                this.log(e.controlData)
                                                e.nodes.forEach(node=>{
                                                    this.sendReq(new WsCtrlMsgReq(
                                                        new SensorControlReqMsg(e.controlData), node, seq++),
                                                        'WsCtrl'
                                                    )
                                                })
                                            }
                                        },
                                        WsCtrlMsgInd: {
                                            guard: ({context: ctx, event: e})=>(e.msg.type == 'SensorDataIndMsg'),
                                            actions: ({context: ctx, event: e})=>{ 
                                                this.event(e)
                                                const m = e.msg
                                                this.log(`Received ${m.type}:`)
                                                this.log(m)
                                                const curr = ctx.model.sensorData.get(m.from) || {}
                                                ctx.model.sensorData.set(m.from, {...curr, pitch: m.pitch, roll: m.roll})
                                                this.update();
                                            }
                                        },
                                    }
                                },
                                lebPanelTab: {
                                    id: 'ledPanelTab',
                                    initial: 'ledPanelIdle',
                                    entry: ({context: ctx, event: e})=>{
                                        this.state('ledPanelTab')
                                        ctx.model.mainTabIndex = MAIN_TAB.LED_PANEL
                                        this.update()
                                    },
                                    states: {
                                        ledPanelIdle: {
                                            id: 'ledPanelIdle',
                                            entry: ({context: ctx, event: e})=>{
                                                this.state('ledPanelIdle')
                                            },
                                            on: {
                                                LedPanelSendClicked: {
                                                    target: '#ledPanelSending',
                                                    actions: ({context: ctx, event: e})=>{
                                                        this.event(e)
                                                        this.log(e.nodes)
                                                        // Remeber 'reference' to event parameters (not deep copy).
                                                        ctx.nodesToSend = e.nodes
                                                        ctx.tickerData = e.tickerData
                                                        ctx.tickerIdx = 0
                                                    }
                                                }
                                            }
                                        },
                                        ledPanelSending: {
                                            id: 'ledPanelSending',
                                            entry: ({context: ctx, event: e})=>{
                                                this.state('ledPanelSending')
                                                ctx.waitTimer.start(LED_PANEL_WAIT_TIMEOUT_MS)
                                                this.resetSeq(['LedPanel'])
                                                const data = ctx.tickerData[ctx.tickerIdx]
                                                ctx.nodesToSend.forEach((node, nodeIdx)=>{
                                                    this.sendReqMsg(new DispTickerReqMsg(data, ctx.tickerIdx),
                                                                    node, 'LedPanel')
                                                })
                                                ctx.tickerIdx++
                                            },
                                            exit: ({context: ctx, event: e})=>{
                                                ctx.waitTimer.stop();
                                            },
                                            on: {
                                                WsCtrlMsgInd: {
                                                    guard: ({context: ctx, event: e})=>(e.msg.type == 'DispTickerCfmMsg'),
                                                    actions: ({context: ctx, event: e})=>{
                                                        this.event(e)
                                                        if (this.clearSeq(e.msg, 'LedPanel')) {
                                                            this.raise(new Evt('Done'))
                                                        }
                                                    }
                                                },
                                                WaitTimer: {
                                                    actions: ({context: ctx, event: e})=> { 
                                                        this.event(e)
                                                        this.error("Missing DispTickerCfmMsg")
                                                        // @todo Prints out which node misses its cfm.
                                                        this.raise(new Evt('Done'))
                                                    }
                                                },
                                                Done: [
                                                    {
                                                        guard: ({context: ctx, event: e})=>(ctx.tickerIdx >= ctx.tickerData.length),
                                                        target: '#ledPanelIdle',
                                                        actions: ({context: ctx, event: e})=>{
                                                            this.event(e)
                                                        }
                                                    },
                                                    {
                                                        guard: ({context: ctx, event: e})=>(ctx.tickerIdx < ctx.tickerData.length),
                                                        target: '#ledPanelSending',
                                                        // Self-transition must NOT be 'internal'.
                                                        actions: ({context: ctx, event: e})=>{
                                                            this.event(e)
                                                            this.log(`Done: idx = ${ctx.tickerIdx}, len = ${ctx.tickerData.length}`)
                                                        }
                                                    }
                                                ]
                                            }
                                        },
                                    }
                                }
                            }
                        },
                    }
                }
            }
        }
        super(name, ctx, config)
        // Adds a reference to the context to "this" object such that it can be used by its methods (eg. update()).
        // Note we cannot assign the context object directly to "this" at the top, since we must call super() before
        // using "this" and we need to pass "ctx" to super() as well.
        this.ctx = ctx
    } // constructor

    // Adds a method to update/render the UI view to reflect the latest "state" of the model.
    update() {
        render(
            <ScreenFlow hsm={this}/>, 
            document.getElementById("react-container")
        )
    }

    sendMsg(m) {
        this.log('sendMsg: ', m)
        this.sendReq(new WsCtrlMsgReq(m, m.to, m.seq), 'WsCtrl')
    }
    // The 'from' parameter(last) is left as null, which will be set in WsCtrl region.
    sendReqMsg(m, to, group) { super.sendReq_((m)=>this.sendMsg(m), m, to, group) }
    sendCfmMsg(m, req) { super.sendCfm_((m)=>this.sendMsg(m), m, req) }
    sendIndMsg(m, to, group) { this.sendReqMsg(m, to, group) }
    sendRspMsg(m, req) { this.sendCfmMsg(m, req) }
}
