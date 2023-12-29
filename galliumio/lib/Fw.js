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

let Emitter = require('tiny-emitter')

"use strict";

let FW = {
    UNDEF:          'UNDEF',

    ERROR_SUCCESS:  'SUCCESS',      // No error, success.
    ERROR_UNSPEC:   'UNSPEC',       // Unspecified.
    ERROR_TIMEOUT:  'TIMEOUT',      // Timeout.
    ERROR_HAL:      'HAL',          // HAL driver error.
    ERROR_HARDWARE: 'HARDWARE',     // Hardware error.
    ERROR_HSMN:     'HSM',          // Invalid HSMN.
    ERROR_STATE:    'STATE',        // Invalid state.
    ERROR_UNAVAIL:  'UNAVAIL',      // Resource unavailable, busy.
    ERROR_PARAM:    'PARAM',        // Invalid parameter, out of range.
    ERROR_AUTH:     'AUTH',         // Authentication error.
    ERROR_NETWORK:  'NETWORK',      // Network error.
    ERROR_ABORT:    'ABORT',        // Operation aborted, e.g. gets a stop req or close req before an ongoing request is completed.

    REASON_UNSPEC:  'UNSPEC',

    // No. of bytes in binary message string fields, used by BufReader and BufWriter.
    // It includes null-termination. Unused bytes are packed with additional null characters.
    ID_LEN:         16,             // nodeId or HSM name length.
    ROLE_LEN:       16,
    SRV_PRIM_LEN:   22,             // ServicePrimitive
    EVT_TYPE_LEN:   16+22,          // ROLE+SERVICE_PRIMITIVE
    EVT_ERROR_LEN:  16,             // FW Error string.
    EVT_REASON_LEN: 16,             // FW Reason string.
    USERNAME_LEN:   32,
    PASSWORD_LEN:   32,
}

class Fw {
    constructor() {
        this.map = new Map()
        this.emitter = new Emitter()
    }
    print() { console.log("Gallium Studio Framework")}
    add(hsm) {
        //console.log(`adding ${hsm.name}`)
        this.map.set(hsm.name, hsm)
        this.emitter.on(hsm.name, hsm.handler)
    }
    post(e) {
        let hsm=this.map.get(e.to)
        if (hsm) {
            //console.log(`hsm found ${hsm.name}`)
            this.emitter.emit(hsm.name, e)
        } else {
            console.log(`Failed to post event to ${e.to}:`)
            console.log(e)
        }
    }
    assert(c) { if (!c) { throw new Error('assert failed')}}
}

module.exports = {
   fw: new Fw(),
   FW: Object.freeze(FW)
}
