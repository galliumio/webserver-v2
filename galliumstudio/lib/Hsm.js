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

require("setimmediate")     // Attaches to global scope.
let {Machine, actions} = require("xstate")
let {interpret} = require('xstate/lib/interpreter')
let Emitter = require('tiny-emitter');
let {fw, FW} = require("./Fw.js")
let {Evt, ErrorEvt} = require("./Evt.js")
let {log} = require("./Log.js") 

"use strict";

// Base class of all HSMs in the system.
class Hsm {
    constructor(name, ctx, config) {
        this.name = name
        this.nextSeq = 0
        this.seqGrpMap = new Map()  // Map of outgoing sequence.
        this.internalQ = []         // Highest priority. Executed before any events in recallQ or main queue.
        this.recallQ = []           // Event queue to hold recalled events. Executed before the next main queue event.
                                    // Can be viewed as front of the main queue.
        this.qMap = new Map()       // Map of defer queues.
        this.stateMap = new Map()   // Map of current states of all regions

        config.context = ctx
        this.machine = Machine(config)
        this.interpreter = interpret(this.machine)
        this.emitter = new Emitter()
        this.handler = (e)=>{
            // Polyfill works for node and browsers.
            setImmediate(()=>{
                //console.log(`setImmediate cb - got event ${e.type}`)
                this.interpreter.send(e)
                this.processInternalQ()
            })
        }
    }

    processInternalQ() {
        let e
        while(e = this.internalQ.pop()) {
            this.interpreter.send(e)
        }
    }
    processRecallQ() {
        let e
        while(e = this.recallQ.pop()) {
            this.interpreter.send(e)
            this.processInternalQ()
        }
    }
    start() {
        fw.add(this)
        log.on(this.name)
        this.interpreter.init()
    }
    genSeq() { 
        let seq = this.nextSeq++
        if (this.nextSeq > 0xFFFF) this.nextSeq = 0
        return seq
    }
    send_(post, e, to, from){
        e.from = from || e.from
        e.to = to || e.to
        post(e)
    }
    sendReq_(post, e, to, group, from){
        e.seq = this.genSeq()
        e.to = to || e.to
        group = group || 'default'
        let seqGrp = this.seqGrpMap.get(group)
        if (!seqGrp) {
            seqGrp = new Map()
            this.seqGrpMap.set(group, seqGrp)
        }
        seqGrp.set(e.to, e.seq)
        this.send_(post, e, e.to, from)
    }
    sendCfm_(post, e, req, from){
        if (req) {
            e.seq = req.seq
            this.send_(post, e, req.from, from)
            this.clearEvt(req)
        }
    }
    clearEvt(e) {
        e.type = FW.UNDEF
        e.to = FW.UNDEF
        e.from = FW.UNDEF
        e.seq = 0
    }

    send(e, to) { this.send_((e)=>fw.post(e), e, to, this.name) }
    sendReq(e, to, group) { this.sendReq_((e)=>fw.post(e), e, to, group, this.name) }
    sendCfm(e, req) { this.sendCfm_((e)=>fw.post(e), e, req, this.name) }
    sendInd(e, to, group) { this.sendReq(e, to, group) }
    sendRsp(e, req) { this.sendCfm(e, req) }
    raise(e){
        e.to = this.name
        e.from = this.name
        this.internalQ.unshift(e)
    }

    defer(e, q){
        q = q || 'default'
        let deferQ = this.qMap.get(q)
        if (!deferQ) {
            deferQ = []
            this.qMap.set(q, deferQ)
        }
        deferQ.unshift(e)
        console.log(`pushing evt ${deferQ.length}`)
    } 
    recall(q){ 
        let deferQ = this.qMap.get(q || 'default')
        if (deferQ) {
            let e
            while(e = deferQ.pop()) {
                console.log(`popping evt ${deferQ.length}`)
                this.recallQ.unshift(e)
            }
        }
    }
    // Matches seq in event against those stored in seqGrpMap.
    matchSeq(e, group){
        let seqGrp = this.seqGrpMap.get(group || 'default')
        if (!seqGrp) {
            return false;
        }
        let seq = seqGrp.get(e.from)
        return ((seq !== undefined) && (seq === e.seq))
    }
    // Clears seq in a group and returns true if all seq in the group are cleared.
    clearSeq(e, group){
        let seqGrp = this.seqGrpMap.get(group || 'default')
        if (!seqGrp) {
            return true     // All cleared if not exist.
        }
        seqGrp.delete(e.from)
        return (seqGrp.size === 0)
    }
    // selector - not passed in to check for default group. Otherwise pass in an array of groups to check for.
    // return true if all selected seq groups are all cleared.
    checkSeq(selector) {
        selector = selector || ['default']
        let result = true
        this.seqGrpMap.forEach((seqGrp, group)=>{
            if (selector.includes(group)) {
                result = result && (seqGrp.size === 0)
            }
        })
        return result
    }
    // Returns true if all sequence groups have been cleared.
    checkAllSeq() {
        let result = true
        this.seqGrpMap.forEach((seqGrp)=>{
            result = result && (seqGrp.size === 0)
        })
        return result
    }
    // selector - not passed in to reset default group. Otherwise pass in an array of groups to reset.
    resetSeq(selector) {
        selector = selector || ['default']
        this.seqGrpMap.forEach((seqGrp, group)=>{
            if (selector.includes(group)) {
                seqGrp.clear() 
            }
        })
    }
    resetAllSeq() {
        this.seqGrpMap.forEach((seqGrp)=>{
            seqGrp.clear()
        })
    }

    error(...msg){ log.error(this.name, ...msg) }
    warning(...msg){ log.warning(this.name, ...msg) }
    critical(...msg){ log.critical(this.name, ...msg) }
    log(...msg){ log.log(this.name, ...msg) }
    info(...msg){ log.info(this.name, ...msg) }

    // @param state - State name  in the format of 'region_state'.
    //                If 'region_' is ommited, it is default to be the 'main region'.
    //                'region' is the unique identifier of a region in a statechart, even
    //                if there are multiple levels of regions. For example is region B is inside
    //                region A, the 'region' prefix can be named as "AB" (rather than "A_B")
    state(state){
        let region = 'main'
        let match = /^([^.]+)_([^.]+)$/.exec(state)
        if (match) {
            region = match[1]
        }
        this.stateMap.set(region, state)
        log.log(this.name, `Enter ${state}`)
    }
    getState(region) { return this.stateMap.get(region || 'main') }
    getStates() { return `[${Array.from(this.stateMap.values()).join(', ')}]` }
    event(e){
        let msg = `Event ${e.type} from ${e.from} seq=${e.seq}`
        if (e instanceof ErrorEvt) {
            msg += ` (error=${e.error} origin=${e.origin} reason=${e.reason})`
        }
        log.log(this.name, msg)
    }
}

module.exports = {
   Hsm
}
