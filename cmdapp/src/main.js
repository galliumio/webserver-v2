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

let {fw, FW, log} = require("../../galliumstudio/lib/index.js")
let {CmdSrv} = require("./CmdSrv.js")
let {WsConn} = require("./WsConn.js")
let {TcpConn} = require("./TcpConn.js")
let {TcpjsConn} = require("./TcpjsConn.js")
let {CliConn} = require("./CliConn.js")
let {CmdSrvStartReq, CmdSrvStopReq} = require("./CmdSrvInterface.js")
let {app, APP} = require("./App.js")

let cmdSrv = new CmdSrv('CmdSrv')
let wsConns = []
for (let i=0; i < APP.WS_CONN_CNT; i++) {
    wsConns.push(new WsConn(app.wsConn(i)))
}
let tcpConns = []
for (let i=0; i < APP.TCP_CONN_CNT; i++) {
    tcpConns.push(new TcpConn(app.tcpConn(i)))
}
let tcpjsConns = []
for (let i=0; i < APP.TCPJS_CONN_CNT; i++) {
    tcpjsConns.push(new TcpjsConn(app.tcpjsConn(i)))
}
let cliConns = []
for (let i=0; i < APP.CLI_CONN_CNT; i++) {
    cliConns.push(new CliConn(app.cliConn(i)))
}
cmdSrv.start()
wsConns.forEach(conn => {
    conn.start()  
})
tcpConns.forEach(conn => {
    conn.start()  
})
tcpjsConns.forEach(conn => {
    conn.start()  
})
cliConns.forEach(conn => {
    conn.start()  
})
//log.onAll();
fw.post(new CmdSrvStartReq('CmdSrv'))

// For test only.
/*
setTimeout(() => {
    fw.post(new CmdSrvStopReq('CmdSrv'))  
}, 1000);
*/
