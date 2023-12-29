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

let {fw, FW} = require("../../../galliumstudio/lib/Fw.js")
let {Evt} = require("../../../galliumstudio/lib/Evt.js")
let {Timer} = require("../../../galliumstudio/lib/Timer.js")

// Webpack specific
import Worker from './WTimer.worker.js';

"use strict";

// Base class of system timers using web worker (only available on browsers).
// Experimental to evaluate differences in accuracy with and without worker and to provide a template
// for using worker with webpack.
class WTimer extends Timer {
    constructor(hsm, type) {
        super(hsm, type)
        this.worker = new Worker();
        this.worker.addEventListener("message", event => {
            //console.log("WTimer timeout seq =", event.data)
            let e = new Evt(this.type, this.hsm, FW.HSM_UNDDEF, event.data)
            fw.post(e)    
        });

    }
    start(timeoutMs, isPeriodic = false) {
        this.incSeq()
        this.worker.postMessage({operation:'start', timeoutMs, isPeriodic, seq: this.seq})
    }
    stop() {
        this.worker.postMessage({operation: 'stop'})
        this.incSeq()
    }
    incSeq() {
        this.seq++
        if (this.seq > 0xFFFF) {
            this.seq = 0;
        }
    }
}

//module.exports = {
//    WTimer
//}
export default WTimer
         