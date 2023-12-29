/******/ (() => { // webpackBootstrap
var __webpack_exports__ = {};
/*!***********************************************************************!*\
  !*** ./node_modules/babel-loader/lib/index.js!./src/WTimer.worker.js ***!
  \***********************************************************************/
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

// Timer ID for clearing it. Should be local to each worker instance.
var id = null;
var periodic = false;
addEventListener("message", function (event) {
  var _event$data = event.data,
    operation = _event$data.operation,
    timeoutMs = _event$data.timeoutMs,
    isPeriodic = _event$data.isPeriodic,
    seq = _event$data.seq;
  if (operation === 'start') {
    //start(timeoutMs, isPeriodic, seq)
    stop();
    periodic = isPeriodic;
    // postMessage can only be called within addEventListener for a worker.
    if (periodic) {
      id = setInterval(function () {
        postMessage(seq);
      }, timeoutMs);
    } else {
      id = setTimeout(function () {
        postMessage(seq);
      }, timeoutMs);
    }
  } else {
    stop();
  }
});
function stop() {
  if (id !== null) {
    if (periodic) {
      clearInterval(id);
    } else {
      clearTimeout(id);
    }
    id = null;
  }
}
/******/ })()
;
//# sourceMappingURL=bundle.worker.js.map