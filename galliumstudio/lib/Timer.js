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

let {fw, FW} = require("./Fw.js")
let {Evt} = require("./Evt.js")

"use strict";

// Base class of system timers.
class Timer {
    constructor(hsm, type) {
        this.hsm = hsm
        this.type = type
        this.isPeriodic = false
        this.id = null
        this.seq = 0
    }
    start(timeoutMs, isPeriodic = false) {
        this.stop()
        this.isPeriodic = isPeriodic
        let timerfn = setTimeout
        if (isPeriodic) {
            timerfn = setInterval
        }
        // @todo - Verify.
        // Define local variable 'seq' to be captured so the captured value will be used in the timeout event.
        // Otherwise if we use 'this.seq' directly it would use the then current value of the captured 'this'.
        let seq = this.seq
        this.id = timerfn(()=>{
            let e = new Evt(this.type, this.hsm, FW.HSM_UNDDEF, seq)
            fw.post(e)    
        }, timeoutMs)
    }
    stop() {
        if (this.id == null) return
        let timerfn = clearTimeout;
        if (this.isPeriodic) {
            timerfn = clearInterval
        }
        timerfn(this.id)
        this.id = null
        this.seq++
        if (this.seq > 0xFFFF) this.seq = 0;
    }
    isValid(e) {
        return (e.seq === this.seq)
    }
}

module.exports = {
    Timer
}
         