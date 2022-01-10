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

let {fw, FW} = require('./Fw.js')

let LOG = {
    TYPE_ERROR:      0,
    TYPE_WARNING:    1,
    TYPE_CRITICAL:   2,
    TYPE_LOG:        3,
    TYPE_INFO:       4
}

const logType = ['<ERROR>', '<WARNING>', '<CRITICAL>', '<LOG>', '<INFO>']

// Verbosity
// 0 - All debug out disabled.
// 1 - Shows ERROR (Type 0).
// 2 - Shows ERROR, WARNING (Type 0-1).
// 3 - Shows ERROR, WARNING, CRITICAL (Type 0-2).
// 4 - Shows ERROR, WARNING, CRITICAL, LOG (Type 0-3).
// 5 - Shows ERROR, WARNING, CRITICAL, LOG, INFO (Type 0-4).
class Log {
    constructor() {
        this.verbosity = 5
        this.enabledHsm = []
    }
    on(name) {
        if (((typeof name) === 'string') && !this.enabledHsm.includes(name)) {
            this.enabledHsm.push(name);
        }
    }
    off(name) {
        let idx = this.enabledHsm.indexOf(name)
        if (idx != (-1)) {
            this.enabledHsm.splice(idx, 1)
        }
    }
    onAll() {
        fw.map.forEach((hsm, name)=> {this.on(name)})
    }
    offAll() {
        fw.map.forEach((hsm, name)=>{this.off(name)})
    }
    isOutput(type, name) {
       return ((type < this.verbosity) && this.enabledHsm.includes(name)) 
    }
    debug(type, name, ...msg) {
        if (this.isOutput(type, name)) {
            let date = new Date()
            let ts = date.getTime() - date.getTimezoneOffset()*60*1000
            const msPerDay = 3600*24*1000
            let timeStr = `${Math.floor(ts/(msPerDay))}:${ts%msPerDay}`
            console.log(`${timeStr} ${logType[type]} ${name}:`, ...msg)
        }
    }
    error(name, ...msg) { this.debug(LOG.TYPE_ERROR, name, ...msg) }
    warning(name, ...msg) { this.debug(LOG.TYPE_WARNING, name, ...msg) }
    critical(name, ...msg) { this.debug(LOG.TYPE_CRITICAL, name, ...msg) }
    log(name, ...msg) { this.debug(LOG.TYPE_LOG, name, ...msg) }
    info(name, ...msg) { this.debug(LOG.TYPE_INFO, name, ...msg) }
    print(...msg) { console.log(...msg) }
}

module.exports = {
    log: new Log(),
    LOG: Object.freeze(LOG)
 }